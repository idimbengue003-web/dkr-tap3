import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-google'
import { db } from '@/lib/db'

/**
 * GET /api/my/wallet — solde + transactions de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }
  try {
    const wallet = await db.getWallet(session.user.email)
    const transactions = await db.listWalletTransactions(session.user.email)
    return NextResponse.json({
      balance: wallet.balance,
      ownerEmail: wallet.ownerEmail,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
      transactions,
    })
  } catch (error) {
    console.error('[GET /api/my/wallet]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
