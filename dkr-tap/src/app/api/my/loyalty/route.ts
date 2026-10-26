import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-google'
import { db, LOYALTY_REWARDS } from '@/lib/db'

/**
 * GET /api/my/loyalty — solde de points + transactions + récompenses
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }
  try {
    const [account, transactions] = await Promise.all([
      db.getLoyalty(session.user.email),
      db.listLoyaltyTransactions(session.user.email),
    ])
    return NextResponse.json({
      points: account.points,
      totalEarned: account.totalEarned,
      totalRedeemed: account.totalRedeemed,
      transactions: transactions.slice(0, 20), // 20 dernières
      rewards: LOYALTY_REWARDS,
    })
  } catch (error) {
    console.error('[GET /api/my/loyalty]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
