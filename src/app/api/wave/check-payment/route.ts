import { NextRequest, NextResponse } from 'next/server'
import { checkRecentTransactions, isWaveConfigured } from '@/lib/wave'
import { requireAuth } from '@/lib/auth-guard'

/**
 * GET /api/wave/check-payment?amount=3000
 *
 * Vérifie si un paiement d'un montant spécifique a été reçu récemment.
 * Auth requis (admin only).
 *
 * Query params:
 *   - amount: montant en FCFA à vérifier (ex: 3000)
 *   - minutes: fenêtre de temps en minutes (default: 60)
 */
export async function GET(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  if (!isWaveConfigured()) {
    return NextResponse.json(
      { error: 'Wave API non configuré' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const amount = searchParams.get('amount')
  const minutes = parseInt(searchParams.get('minutes') || '60')

  const result = await checkRecentTransactions(
    amount ? parseInt(amount) : undefined,
    minutes
  )

  return NextResponse.json({
    ...result,
    checkedAt: new Date().toISOString(),
    minutes,
    amountSearched: amount ? parseInt(amount) : null,
  })
}
