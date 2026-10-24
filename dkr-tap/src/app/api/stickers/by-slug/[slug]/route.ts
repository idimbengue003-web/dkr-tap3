import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/stickers/by-slug/[slug] — PUBLIC
 * Récupère les infos d'un sticker par son slug (pour la page /configure/[slug])
 * Ne renvoie PAS l'email de l'acheteur (sécurité)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const sticker = await db.getStickerBySlug(slug)

  if (!sticker) {
    return NextResponse.json({ error: 'Carte introuvable' }, { status: 404 })
  }

  if (!sticker.active) {
    return NextResponse.json({ error: 'Cette carte a été désactivée' }, { status: 403 })
  }

  // Renvoyer seulement les infos publiques
  return NextResponse.json({
    slug: sticker.slug,
    label: sticker.label,
    targetUrl: sticker.targetUrl, // si déjà configuré, la page redirige
    active: sticker.active,
    scanCount: sticker.scanCount,
  })
}
