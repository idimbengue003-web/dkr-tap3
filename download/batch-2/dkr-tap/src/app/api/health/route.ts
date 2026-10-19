import { NextResponse } from 'next/server'
import { store } from '@/lib/db'
import { isAuthConfigured } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/health
// Healthcheck public (pas d'auth) — utilisé par Vercel pour les checks de disponibilité.
//
// Retourne 200 si KV répond à un set+get+del test, 503 sinon.
// Réponse JSON :
//   {
//     "status": "ok" | "fail",
//     "timestamp": "2026-09-28T16:42:34.000Z",
//     "uptime": "1h23m",  ( seulement en prod )
//     "auth": { "configured": true },
//     "storage": { "mode": "vercel-kv" | "mock-kv", "reachable": true }
//   }
export async function GET() {
  const checks = {
    status: 'ok' as 'ok' | 'fail',
    timestamp: new Date().toISOString(),
    auth: {
      configured: isAuthConfigured(),
    },
    storage: {
      mode: process.env.KV_REST_API_URL ? 'vercel-kv' : 'mock-kv',
      reachable: false,
      latencyMs: 0,
    },
  }

  // Test KV : set+get+del d'une clé sentinelle unique
  const pingKey = `__health_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const pingValue = `pong_${Date.now()}`

  try {
    const t0 = Date.now()
    await store.set(pingKey, pingValue)
    const retrieved = await store.get<string>(pingKey)
    await store.del(pingKey)
    const t1 = Date.now()

    checks.storage.latencyMs = t1 - t0
    checks.storage.reachable = retrieved === pingValue

    if (!checks.storage.reachable) {
      checks.status = 'fail'
    }
  } catch (e) {
    checks.status = 'fail'
    checks.storage.reachable = false
    checks.storage.latencyMs = 0
    // Ne pas exposer l'erreur détaillée (sécurité)
    console.error('[/api/health] Storage check failed:', e)
  }

  return NextResponse.json(checks, {
    status: checks.status === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
