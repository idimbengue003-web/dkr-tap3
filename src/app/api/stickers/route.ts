import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// POST /api/stickers
// Crée un nouveau sticker (vierge ou avec URL).
// Body: { label?, targetUrl?, slug?, active? }
// Auth requis.
export async function POST(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  try {
    const body = await request.json()
    const {
      label,
      targetUrl,
      slug: customSlug,
      active = true,
      customActionText,
      customNetwork,
      qrPosition,
    } = body

    // Générer un slug unique court si non fourni (8 caractères base36)
    let slug =
      typeof customSlug === 'string' && customSlug.trim()
        ? customSlug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
        : Math.random().toString(36).slice(2, 10)

    // Vérifier l'unicité du slug et en régénérer un si collision
    let attempts = 0
    while (await db.slugExists(slug)) {
      if (attempts++ > 10) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
        break
      }
      slug = Math.random().toString(36).slice(2, 10)
    }

    // Valider targetUrl si fournie
    let finalTargetUrl: string | null = null
    if (typeof targetUrl === 'string' && targetUrl.trim()) {
      try {
        finalTargetUrl = new URL(targetUrl.trim()).toString()
      } catch {
        return NextResponse.json(
          { error: 'URL cible invalide' },
          { status: 400 }
        )
      }
    }

    // Valider customNetwork (doit être une des valeurs acceptées)
    const validNetworks = ['google', 'tiktok', 'instagram', 'none']
    const finalCustomNetwork =
      typeof customNetwork === 'string' && validNetworks.includes(customNetwork)
        ? (customNetwork as 'google' | 'tiktok' | 'instagram' | 'none')
        : null

    // Valider qrPosition (objet { x, y } entre 0 et 1)
    let finalQrPosition: { x: number; y: number } | undefined
    if (
      qrPosition &&
      typeof qrPosition === 'object' &&
      typeof qrPosition.x === 'number' &&
      typeof qrPosition.y === 'number' &&
      qrPosition.x >= 0 && qrPosition.x <= 1 &&
      qrPosition.y >= 0 && qrPosition.y <= 1
    ) {
      finalQrPosition = { x: qrPosition.x, y: qrPosition.y }
    }

    const sticker = await db.createSticker({
      slug,
      label: label?.trim() || null,
      targetUrl: finalTargetUrl,
      active: Boolean(active),
      customActionText:
        typeof customActionText === 'string' && customActionText.trim()
          ? customActionText.trim()
          : null,
      customNetwork: finalCustomNetwork,
      qrPosition: finalQrPosition,
    })

    return NextResponse.json(sticker, { status: 201 })
  } catch (error) {
    console.error('[POST /api/stickers]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du sticker' },
      { status: 500 }
    )
  }
}

// GET /api/stickers
// Liste tous les stickers (tri par createdAt desc).
// Auth requis.
export async function GET(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  try {
    const stickers = await db.listStickers()
    return NextResponse.json(stickers)
  } catch (error) {
    console.error('[GET /api/stickers]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des stickers' },
      { status: 500 }
    )
  }
}
