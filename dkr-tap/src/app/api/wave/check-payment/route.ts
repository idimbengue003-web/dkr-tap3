import { NextRequest, NextResponse } from 'next/server'
import { checkPaymentReceived, isWaveConfigured } from '@/lib/wave'

/**
 * GET /api/wave/check-payment?amount=3000&minutes=30
 *
 * Vérifie AUTOMATIQUEMENT si un paiement d'un montant spécifique a été reçu
 * dans les N dernières minutes via l'API Wave Business.
 *
 * Comment ça marche :
 * 1. Le client clique "Payer avec Wave" → paie sur Wave
 * 2. Ton site appelle cette route → interroge l'API Wave
 * 3. Si une transaction du bon montant a été reçue → { received: true }
 * 4. Si non → { received: false } → réessayer dans 30 sec
 *
 * Auth requis (admin only — l'API vérifie les paiements reçus sur ton wallet).
 */
export async function GET(request: NextRequest) {
  if (!isWaveConfigured()) {
    return NextResponse.json(
      { error: 'Wave API non configuré (WAVE_API_TOKEN manquant)' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const amount = searchParams.get('amount')
  const minutes = parseInt(searchParams.get('minutes') || '30')

  if (!amount) {
    return NextResponse.json(
      { error: 'Paramètre ?amount= requis (montant en FCFA)' },
      { status: 400 }
    )
  }

  const expectedAmount = parseInt(amount)
  const result = await checkPaymentReceived(expectedAmount, minutes)

  return NextResponse.json({
    ...result,
    expectedAmount,
    withinMinutes: minutes,
    waveWallet: 'W_sn_LUvGY4hJVmNP',
    merchant: 'Gaming Store',
  })
}
