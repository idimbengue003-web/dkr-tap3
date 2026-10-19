import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-google'
import { db } from '@/lib/db'

/**
 * GET /api/my/profile — récupère le profil de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }
  try {
    const profile = await db.getProfile(session.user.email)
    return NextResponse.json(profile)
  } catch (error) {
    console.error('[GET /api/my/profile]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PATCH /api/my/profile — met à jour le profil de l'utilisateur connecté
 *
 * Body: { fullName?, phone?, city?, address?, deliveryNote? }
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }
  try {
    const body = await request.json()

    // Sanitize + valider chaque champ (tous optionnels)
    const updates: any = {}
    if (typeof body.fullName === 'string') {
      const v = body.fullName.trim().slice(0, 100)
      updates.fullName = v || null
    }
    if (typeof body.phone === 'string') {
      const v = body.phone.trim().slice(0, 30)
      updates.phone = v || null
    }
    if (typeof body.city === 'string') {
      const v = body.city.trim().slice(0, 100)
      updates.city = v || null
    }
    if (typeof body.address === 'string') {
      const v = body.address.trim().slice(0, 500)
      updates.address = v || null
    }
    if (typeof body.deliveryNote === 'string') {
      const v = body.deliveryNote.trim().slice(0, 500)
      updates.deliveryNote = v || null
    }

    const updated = await db.updateProfile(session.user.email, updates)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/my/profile]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
