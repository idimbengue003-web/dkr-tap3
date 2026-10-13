import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

/**
 * GET /api/stickers/[id]/image
 * Renvoie l'image uploadée pour ce sticker (Content-Type correct).
 * Auth requis (les images sont privées, contiennent le branding du client).
 *
 * Réponses :
 *   200 OK → image binaire (ou data URL redirigée)
 *   401 Unauthorized
 *   404 Not Found → sticker ou image introuvable
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard

  const { id } = await params
  const sticker = await db.getStickerById(id)
  if (!sticker) {
    return NextResponse.json(
      { error: 'Sticker introuvable' },
      { status: 404 }
    )
  }

  const dataUrl = await db.getImage(sticker.slug)
  if (!dataUrl) {
    return NextResponse.json(
      { error: 'Aucune image pour ce sticker' },
      { status: 404 }
    )
  }

  // Extraire le Content-Type et le base64 depuis la data URL
  // Format : "data:image/png;base64,iVBOR..."
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    // Pas une data URL valide — renvoyer telle quelle (au cas où)
    return new NextResponse(dataUrl, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      },
    })
  }

  const [, contentType, base64Data] = match
  const buffer = Buffer.from(base64Data, 'base64')

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300', // cache 5 min côté navigateur (privé car auth-required)
    },
  })
}

/**
 * POST /api/stickers/[id]/image
 * Stocke (ou remplace) l'image uploadée pour ce sticker.
 * Body JSON : { image: "data:image/...;base64,..." }
 *
 * Limites :
 *   - Taille max : 500 KB (après base64 encoding)
 *   - Formats acceptés : image/png, image/jpeg, image/webp
 *
 * Réponses :
 *   200 OK → { ok: true }
 *   400 Bad Request → image manquante, format non supporté, ou trop volumineuse
 *   401 Unauthorized
 *   404 Not Found → sticker introuvable
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard

  const { id } = await params
  const sticker = await db.getStickerById(id)
  if (!sticker) {
    return NextResponse.json(
      { error: 'Sticker introuvable' },
      { status: 404 }
    )
  }

  let body: { image?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Corps de requête invalide (JSON attendu)' },
      { status: 400 }
    )
  }

  const dataUrl = typeof body.image === 'string' ? body.image.trim() : ''
  if (!dataUrl) {
    return NextResponse.json(
      { error: 'Champ "image" manquant. Format attendu : {"image": "data:image/...;base64,..."}' },
      { status: 400 }
    )
  }

  // Valider le format data URL
  const match = dataUrl.match(/^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/)
  if (!match) {
    return NextResponse.json(
      { error: 'Format d\'image invalide. Accepté : data:image/png|jpeg|webp;base64,...' },
      { status: 400 }
    )
  }

  const [, , , base64Data] = match

  // Limite de 500 KB après base64 (≈ 375 KB de données binaires)
  const MAX_BASE64_SIZE = 500 * 1024
  if (base64Data.length > MAX_BASE64_SIZE) {
    return NextResponse.json(
      {
        error: `Image trop volumineuse (${Math.round(base64Data.length / 1024)} KB). Maximum ${Math.round(MAX_BASE64_SIZE / 1024)} KB après base64.`,
      },
      { status: 400 }
    )
  }

  try {
    await db.setImage(sticker.slug, dataUrl)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[POST /api/stickers/[id]/image]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde de l\'image' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/stickers/[id]/image
 * Supprime l'image d'un sticker.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard

  const { id } = await params
  const sticker = await db.getStickerById(id)
  if (!sticker) {
    return NextResponse.json(
      { error: 'Sticker introuvable' },
      { status: 404 }
    )
  }

  try {
    await db.deleteImage(sticker.slug)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/stickers/[id]/image]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'image' },
      { status: 500 }
    )
  }
}
