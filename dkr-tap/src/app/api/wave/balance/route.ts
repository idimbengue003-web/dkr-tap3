import { NextRequest, NextResponse } from 'next/server'
import { getWalletBalance, isWaveConfigured } from '@/lib/wave'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/wave/balance — auth requis (admin only)
// Affiche le solde du wallet Wave Business
export async function GET(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  if (!isWaveConfigured()) {
    return NextResponse.json(
      { error: 'Wave API non configuré (WAVE_API_TOKEN manquant)' },
      { status: 503 }
    )
  }

  const balance = await getWalletBalance()
  if (!balance) {
    return NextResponse.json(
      { error: 'Impossible de contacter l\'API Wave' },
      { status: 502 }
    )
  }

  return NextResponse.json({
    balance: balance.balance,
    grossVolume: balance.grossVolume,
    balanceFormatted: `${balance.balance.toLocaleString('fr-FR')} FCFA`,
    grossVolumeFormatted: `${balance.grossVolume.toLocaleString('fr-FR')} FCFA`,
    fetchedAt: new Date().toISOString(),
  })
}
