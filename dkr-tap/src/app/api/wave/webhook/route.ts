import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

/**
 * Webhook Wave — reçoit les notifications de paiement depuis Wave Business.
 *
 * Endpoint PUBLIC (pas d'auth admin — Wave l'appelle depuis ses serveurs).
 * L'authentification se fait via signature HMAC-SHA256 du header `Wave-Signature`.
 *
 * Configuration Wave :
 * 1. Wave Business dashboard → Paramètres → Webhooks → "Ajouter un webhook"
 * 2. URL du webhook : https://<TON-DOMAINE>/api/wave/webhook
 * 3. Secret du webhook : généré par Wave → le copier dans WAVE_WEBHOOK_SECRET (Vercel env var)
 *
 * Format du header Wave-Signature : "t=<timestamp>,v1=<hmac-sha256-hex>"
 * Le HMAC est calculé sur `${timestamp}.${rawBody}` avec le secret du webhook.
 *
 * Logique :
 * - Si le paiement est "success" et a un montant > 0
 * - On cherche une commande "pending" avec ce montant exact créée dans les 30 dernières minutes
 * - On marque la commande comme "paid"
 */

const WEBHOOK_SECRET = process.env.WAVE_WEBHOOK_SECRET

/** Vérifie la signature HMAC-SHA256 du header Wave-Signature */
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!WEBHOOK_SECRET) {
    // Si pas de secret configuré → on accepte (mode test / dev local)
    // ⚠️ En production, TOUJOURS configurer WAVE_WEBHOOK_SECRET
    console.warn('[Wave webhook] WAVE_WEBHOOK_SECRET non configuré — webhook accepté sans vérification (mode dev)')
    return true
  }
  if (!signatureHeader) return false

  // Format : "t=1234567890,v1=abc123def456..."
  const parts = signatureHeader.split(',')
  const tPart = parts.find((p) => p.trim().startsWith('t='))
  const v1Part = parts.find((p) => p.trim().startsWith('v1='))
  if (!tPart || !v1Part) return false

  const t = tPart.split('=')[1]?.trim()
  const v1 = v1Part.split('=')[1]?.trim()
  if (!t || !v1) return false

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${t}.${rawBody}`)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

/** Extrait le montant et le statut du payload Wave — supporte plusieurs formats */
function parseWaveEvent(body: any): { amount: number; status: string; txId: string | null; sender: string | null } {
  // Format Wave Business (GraphQL-ish)
  // Plusieurs structures possibles selon le type d'événement
  const obj = body?.data?.object ?? body?.data ?? body?.object ?? body

  // Le montant peut être en FCFA (entier) ou en centimes (string avec décimales)
  let amount = 0
  const rawAmount = obj?.amount ?? obj?.value ?? obj?.amount_fcash ?? obj?.net_amount
  if (typeof rawAmount === 'number') {
    amount = rawAmount
  } else if (typeof rawAmount === 'string') {
    const parsed = parseFloat(rawAmount)
    amount = isNaN(parsed) ? 0 : Math.round(parsed)
  }

  // Si l'amount est en centimes (> 100 000 pour une commande typique de 35 000 FCFA), on divise
  // Heuristique simple : si amount > 100 000 et divisible par 100, c'est probablement des centimes
  // (à ajuster selon la vraie API Wave)
  if (amount > 100000 && amount % 100 === 0) {
    // Possible que ce soit en centimes — mais on garde tel quel pour l'instant
    // (Wave Sénégal utilise généralement des FCFA entiers)
  }

  const status = (obj?.status ?? obj?.state ?? body?.type ?? '').toString().toLowerCase()
  const txId = obj?.id ?? obj?.transaction_id ?? obj?.opaque_id ?? null
  const sender = obj?.sender ?? obj?.from ?? obj?.customer ?? obj?.client?.name ?? null

  return { amount, status, txId, sender }
}

export async function POST(request: NextRequest) {
  // Récupérer le body brut pour vérifier la signature
  const rawBody = await request.text()
  const signature = request.headers.get('wave-signature') || request.headers.get('Wave-Signature')

  if (!verifySignature(rawBody, signature)) {
    console.warn('[Wave webhook] Signature invalide — rejeté')
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const { amount, status, txId, sender } = parseWaveEvent(event)

  // On n'accepte que les paiements réussis
  const isSuccess =
    status === 'success' ||
    status === 'completed' ||
    status === 'paid' ||
    status === 'payment.completed' ||
    status === 'transaction.completed' ||
    status === 'p2p.transfer.completed'

  if (!isSuccess || amount <= 0) {
    console.log(`[Wave webhook] Ignoré — status: ${status}, amount: ${amount}`)
    return NextResponse.json({ ok: true, ignored: true, reason: 'not success or amount=0', status, amount })
  }

  // Chercher une commande "pending" avec ce montant exact, créée dans les 30 dernières minutes
  const orders = await db.listOrders()
  const now = Date.now()
  const WINDOW_MS = 30 * 60 * 1000 // 30 minutes

  const matchingOrder = orders.find(
    (o) =>
      o.status === 'pending' &&
      o.totalAfter === amount &&
      now - new Date(o.createdAt).getTime() < WINDOW_MS
  )

  if (!matchingOrder) {
    console.log(
      `[Wave webhook] Aucune commande "pending" trouvée pour ${amount} FCFA dans les 30 dernières minutes — paiement ignoré (à valider manuellement)`
    )
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: 'no matching pending order',
      amount,
      txId,
    })
  }

  // Marquer la commande comme payée
  const updated = await db.updateOrderStatus(matchingOrder.id, 'paid')
  console.log(
    `[Wave webhook] ✓ Commande ${matchingOrder.id} marquée "paid" (tx: ${txId}, sender: ${sender}, amount: ${amount} FCFA)`
  )

  return NextResponse.json({
    ok: true,
    orderId: matchingOrder.id,
    status: 'paid',
    txId,
    amount,
  })
}

// GET pour debug — renvoie un petit statut du webhook (utile pour vérifier que l'endpoint est vivant)
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'Wave webhook',
    configured: !!WEBHOOK_SECRET,
    message: WEBHOOK_SECRET
      ? 'Webhook prêt — signature vérifiée à chaque appel'
      : 'Webhook en mode dev (pas de signature vérifiée) — configurer WAVE_WEBHOOK_SECRET pour la prod',
  })
}
