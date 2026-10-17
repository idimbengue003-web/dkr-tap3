import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-google'
import { db } from '@/lib/db'

/**
 * GET /api/my/stickers — liste les stickers de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }
  try {
    const stickers = await db.listStickersByBuyerEmail(session.user.email)
    return NextResponse.json(stickers)
  } catch (error) {
    console.error('[GET /api/my/stickers]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
