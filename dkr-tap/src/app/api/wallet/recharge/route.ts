import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-google'
import { db } from '@/lib/db'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

const WAVE_BASE_URL = process.env.NEXT_PUBLIC_WAVE_PAYMENT_URL || '#'

function buildWaveUrl(amount: number): string {
  if (WAVE_BASE_URL === '#') return '#'
  const base = WAVE_BASE_URL.replace(/\/$/, '')
  return `${base}?amount=${amount}`
}

/**
 * POST /api/wallet/recharge — auth requis (Google)
 *
 * Body : { amount: number }
 *
 * Crée une commande de type 'recharge' (status pending), renvoie l'URL Wave
 * pour que l'utilisateur paie. Le polling sur /api/orders/[id]/check-payment
 * détecte le paiement et ajoute le montant au solde wallet automatiquement.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  // Rate limiting : 3 recharges / IP / heure
  const limit = await checkRateLimit(request, 'wallet-recharge', 3, 60 * 60)
  if (limit.exceeded) return rateLimitResponse(limit.resetAt)

  try {
    const body = await request.json()
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount < 1000) {
      return NextResponse.json({ error: 'Montant minimum : 1000 FCFA' }, { status: 400 })
    }
    if (amount > 1_000_000) {
      return NextResponse.json({ error: 'Montant maximum : 1 000 000 FCFA' }, { status: 400 })
    }
    const roundedAmount = Math.round(amount)

    // Créer une commande de recharge (type='recharge')
    const order = await db.createOrder({
      items: [
        {
          key: 'recharge',
          name: `Recharge solde ${roundedAmount.toLocaleString('fr-FR')} FCFA`,
          price: roundedAmount,
          unitPrice: roundedAmount,
          qty: 1,
          imagePath: null,
        },
      ],
      totalQty: 1,
      totalBefore: roundedAmount,
      totalAfter: roundedAmount,
      discountPct: 0,
      paymentMethod: 'wave',
      customerName: session.user.email, // email Google = owner du wallet
      customerPhone: null,
      customerNote: null,
      type: 'recharge',
    })

    return NextResponse.json({
      orderId: order.id,
      amount: roundedAmount,
      waveUrl: buildWaveUrl(roundedAmount),
    })
  } catch (error) {
    console.error('[POST /api/wallet/recharge]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
