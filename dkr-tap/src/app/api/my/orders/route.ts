import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-google'
import { db } from '@/lib/db'

/**
 * GET /api/my/orders — liste les commandes de l'utilisateur connecté
 * (filtrées par email Google)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }
  try {
    const orders = await db.listOrdersByEmail(session.user.email)
    return NextResponse.json(orders)
  } catch (error) {
    console.error('[GET /api/my/orders]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
