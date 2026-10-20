import { NextRequest, NextResponse } from 'next/server'

/**
 * Rate limiting basique en mémoire (par IP).
 * Ne fonctionne que par instance serverless — pour un vraie protection,
 * passer à Upstash Rate Limiting (gratuit jusqu'à 10k req/jour).
 *
 * Usage :
 * ```
 * import { checkRateLimit } from '@/lib/rate-limit'
 *
 * const limit = await checkRateLimit(request, 'orders-create', 5, 60 * 60) // 5/heure
 * if (limit.exceeded) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
 * ```
 */

type Bucket = {
  count: number
  resetAt: number
}

// Map<key, Bucket> — persiste pendant la vie de l'instance serverless
const buckets = new Map<string, Bucket>()

// Nettoyer les buckets expirés toutes les 5 minutes pour éviter la fuite mémoire
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k)
  }
}

/** Récupère l'IP réelle du client (gère le proxy Vercel) */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Vérifie si l'IP a dépassé la limite de requêtes.
 * @param request Requête Next.js
 * @param keySuffix Identifiant du endpoint (ex: 'orders-create')
 * @param maxReq Nb max de requêtes
 * @param windowSec Fenêtre en secondes
 * @returns { exceeded: boolean, remaining: number, resetAt: number }
 */
export async function checkRateLimit(
  request: NextRequest,
  keySuffix: string,
  maxReq: number,
  windowSec: number
): Promise<{ exceeded: boolean; remaining: number; resetAt: number }> {
  const ip = getClientIp(request)
  const key = `${ip}:${keySuffix}`
  const now = Date.now()
  const windowMs = windowSec * 1000

  cleanup(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt < now) {
    // Premier appel dans la fenêtre
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { exceeded: false, remaining: maxReq - 1, resetAt: now + windowMs }
  }

  existing.count++
  const exceeded = existing.count > maxReq
  const remaining = Math.max(0, maxReq - existing.count)
  return { exceeded, remaining, resetAt: existing.resetAt }
}

/** Réponse 429 standard pour rate limit dépassé */
export function rateLimitResponse(resetAt: number): NextResponse {
  const resetInSeconds = Math.ceil((resetAt - Date.now()) / 1000)
  return NextResponse.json(
    {
      error: 'Trop de requêtes',
      message: `Réessaye dans ${resetInSeconds}s`,
      retryAfter: resetInSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(resetInSeconds),
        'X-RateLimit-Reset': String(resetAt),
      },
    }
  )
}
