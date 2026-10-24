import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/stickers/by-slug/[slug]/redirect-url — PUBLIC
 *
 * Permet à un client de configurer l'URL de redirection de sa carte QR
 * la première fois qu'il la scanne (page /configure/[slug]).
 *
 * Sécurité : le slug est unique et difficile à deviner (aléatoire).
 * Une fois configurée, la page ne sera plus accessible (la carte redirige
 * directement vers l'URL configurée).
 *
 * Body: { targetUrl: string }
 */
export async function POST(
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

  // Si déjà configurée, refuser (la page ne devrait plus être accessible)
  if (sticker.targetUrl) {
    return NextResponse.json(
      { error: 'Cette carte a déjà été configurée', targetUrl: sticker.targetUrl },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const targetUrl = String(body.targetUrl || '').trim()

    if (!targetUrl) {
      return NextResponse.json({ error: 'URL requise' }, { status: 400 })
    }

    // Valider l'URL
    let finalUrl: string
    try {
      finalUrl = new URL(targetUrl).toString()
    } catch {
      // Essayer avec https://
      try {
        finalUrl = new URL(`https://${targetUrl}`).toString()
      } catch {
        return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
      }
    }

    // Sauvegarder l'URL
    const updated = await db.updateSticker(slug, {
      targetUrl: finalUrl,
      customActionText: sticker.customActionText,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Échec de la sauvegarde' }, { status: 500 })
    }

    console.log(`[configure] ✓ Carte ${slug} configurée → ${finalUrl}`)

    return NextResponse.json({
      ok: true,
      slug,
      targetUrl: finalUrl,
      message: 'Carte configurée avec succès',
    })
  } catch (error) {
    console.error('[POST /api/stickers/by-slug/[slug]/redirect-url]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
