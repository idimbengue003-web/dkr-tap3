import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

/**
 * POST /api/stickers/[id]/duplicate
 *
 * Duplique un sticker : crée un NOUVEAU sticker qui hérite de :
 *   - L'image uploadée
 *   - La position du QR (qrPosition)
 *   - La taille du QR (qrSize)
 *   - Le texte overlay (textOverlay)
 *   - Le réseau forcé (customNetwork)
 *   - Le texte d'action (customActionText)
 *
 * Mais avec un nouveau slug, un nouvel id, et targetUrl = null.
 * Le label devient "Copie de <original label>".
 *
 * Pratique pour créer des stickers à partir d'un "modèle" :
 * l'utilisateur configure un sticker parfait une fois, puis le duplique
 * pour chaque nouveau client en changeant juste l'URL cible.
 *
 * Auth requis.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard

  try {
    const { id } = await params
    const duplicated = await db.duplicateSticker(id)

    if (!duplicated) {
      return NextResponse.json(
        { error: 'Sticker original introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json(duplicated, { status: 201 })
  } catch (error) {
    console.error('[POST /api/stickers/[id]/duplicate]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la duplication du sticker' },
      { status: 500 }
    )
  }
}
