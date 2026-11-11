import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

/**
 * POST /api/stickers/bulk
 *
 * Crée N stickers vierges (chacun avec son propre slug unique) en une fois.
 * Cas d'usage : l'admin veut imprimer 100 stickers pour un événement / salon,
 * chaque sticker ayant son propre QR code → chaque client qui achète/scanne
 * configure SON URL, et les 99 autres sont indépendants.
 *
 * Body: {
 *   labelPrefix: string   — ex "Stand Salon B26" → labels "Stand Salon B26 #1"...
 *   qty: number            — nombre de stickers à créer (max 500)
 *   customNetwork?: string — réseau affiché sur le sticker (optionnel)
 *   active?: boolean       — défaut true
 * }
 *
 * Retourne: { batchId, created: Sticker[] }
 * batchId est juste un timestamp pour grouper visuellement dans l'admin.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  try {
    const body = await request.json()
    const {
      labelPrefix,
      qty,
      customNetwork,
      active = true,
    } = body

    // Validation
    const count = parseInt(qty, 10)
    if (!Number.isFinite(count) || count < 1 || count > 500) {
      return NextResponse.json(
        { error: 'Quantité invalide (1 à 500)' },
        { status: 400 }
      )
    }

    const prefix =
      typeof labelPrefix === 'string' && labelPrefix.trim()
        ? labelPrefix.trim().slice(0, 100)
        : 'Sticker'

    const validNetworks = ['google', 'tiktok', 'instagram', 'whatsapp', 'youtube', 'facebook', 'snapchat', 'none']
    const finalCustomNetwork =
      typeof customNetwork === 'string' && validNetworks.includes(customNetwork)
        ? (customNetwork as any)
        : null

    // Batch ID = timestamp pour grouper visuellement dans l'admin
    const batchId = `batch-${Date.now().toString(36)}`

    const created = []
    for (let i = 0; i < count; i++) {
      // Slug unique de 8 caractères
      let slug = Math.random().toString(36).slice(2, 10)
      let attempts = 0
      while (await db.slugExists(slug)) {
        if (attempts++ > 10) {
          slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
          break
        }
        slug = Math.random().toString(36).slice(2, 10)
      }

      const sticker = await db.createSticker({
        slug,
        // Label : "Prefix #1 (batch xxx)", "Prefix #2", etc.
        label: `${prefix} #${i + 1} (${batchId})`,
        targetUrl: null, // vierge — le client configurera au premier scan
        active: Boolean(active),
        customNetwork: finalCustomNetwork,
      })
      created.push(sticker)
    }

    return NextResponse.json({ batchId, created }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/stickers/bulk]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création en masse' },
      { status: 500 }
    )
  }
}
