import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-google'
import { db } from '@/lib/db'

/**
 * PATCH /api/my/stickers/[id] — l'acheteur modifie le targetUrl de SON sticker
 *
 * Vérifie que :
 * - l'utilisateur est connecté via Google
 * - le sticker appartient bien à cet utilisateur (buyerEmail === email)
 *
 * Body: { targetUrl: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const { id } = await params
  const sticker = await db.getStickerById(id)
  if (!sticker) {
    return NextResponse.json({ error: 'Sticker introuvable' }, { status: 404 })
  }

  // Vérifier que ce sticker appartient bien à l'utilisateur
  const userEmail = session.user.email.toLowerCase()
  if ((sticker.buyerEmail || '').toLowerCase() !== userEmail) {
    return NextResponse.json({ error: 'Ce sticker ne vous appartient pas' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { targetUrl } = body

    // Valider l'URL
    let finalTargetUrl: string | null = null
    if (typeof targetUrl === 'string' && targetUrl.trim()) {
      try {
        finalTargetUrl = new URL(targetUrl.trim()).toString()
      } catch {
        return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
      }
    }

    // Mettre à jour uniquement le targetUrl (pas l'active ni le label)
    // Utilise updateSticker existant
    const updated = await db.updateSticker(sticker.slug, {
      targetUrl: finalTargetUrl,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Échec de la mise à jour' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/my/stickers/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
