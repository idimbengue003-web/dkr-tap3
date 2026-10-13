import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

/**
 * POST /api/save-link
 *
 * Endpoint simplifié pour mettre à jour l'URL cible d'un sticker par son slug.
 * Pratique pour l'édition par scan QR : on scanne → on récupère un slug
 * → on POST `{slug, url}` ici pour sauver le nouveau lien sans avoir à
 * connaître l'`id` interne du sticker.
 *
 * Body (JSON) :
 *   {
 *     "slug": "yntacfta",        // slug du sticker (requis)
 *     "url": "https://...",      // nouvelle URL cible (requis, null pour vider)
 *     "label": "Nouveau label"   // optionnel : met à jour aussi le label
 *   }
 *
 * Réponses :
 *   200 OK → { ...sticker }              (mise à jour réussie)
 *   400 Bad Request → { error: "..." }  (slug manquant, URL invalide)
 *   401 Unauthorized                    (cookie admin manquant)
 *   404 Not Found → { error: "Sticker introuvable" }
 *   500 Internal Server Error
 *
 * Auth requis (cookie admin) — sans ça, n'importe qui pourrait modifier
 * n'importe quel sticker en devinant les slugs.
 */
export async function POST(request: NextRequest) {
  // 1. Vérifier l'authentification
  const guard = await requireAuth(request)
  if (guard) return guard

  // 2. Parser le body
  let body: { slug?: string; url?: string | null; label?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Corps de requête invalide (JSON attendu)' },
      { status: 400 }
    )
  }

  // 3. Valider le slug (requis)
  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  if (!slug) {
    return NextResponse.json(
      { error: 'Slug manquant dans le body. Format attendu : {"slug": "...", "url": "..."}' },
      { status: 400 }
    )
  }

  // 4. Valider l'URL (requis, mais peut être vide pour "vider" le sticker)
  let finalUrl: string | null = null
  if (body.url !== undefined && body.url !== null) {
    const urlStr = typeof body.url === 'string' ? body.url.trim() : ''
    if (urlStr) {
      try {
        finalUrl = new URL(urlStr).toString()
      } catch {
        return NextResponse.json(
          { error: `URL invalide : "${urlStr}". Doit commencer par http:// ou https://` },
          { status: 400 }
        )
      }
    }
    // Si urlStr est vide → finalUrl reste null (sticker devient vierge)
  }

  // 5. Label optionnel
  const label =
    body.label !== undefined
      ? typeof body.label === 'string' && body.label.trim()
        ? body.label.trim()
        : null
      : undefined

  // 6. Mettre à jour le sticker par slug
  try {
    const updates: {
      targetUrl?: string | null
      label?: string | null
    } = {}
    if (body.url !== undefined) updates.targetUrl = finalUrl
    if (label !== undefined) updates.label = label

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Aucune valeur à mettre à jour. Fournissez "url" et/ou "label" dans le body.' },
        { status: 400 }
      )
    }

    const updated = await db.updateStickerBySlug(slug, updates)
    if (!updated) {
      return NextResponse.json(
        { error: `Sticker introuvable pour le slug "${slug}"` },
        { status: 404 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[POST /api/save-link]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde du lien' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/save-link?slug=<slug>
 *
 * Récupère l'URL cible actuelle d'un sticker par son slug.
 * Utile pour le flow "scan → voir l'URL actuelle → éditer → sauver".
 *
 * Auth requis (évite de révéler quels slugs existent à des attaquants).
 *
 * Réponses :
 *   200 → { slug, targetUrl, label, active, scanCount }
 *   400 → { error: "Paramètre slug manquant" }
 *   404 → { error: "Sticker introuvable" }
 */
export async function GET(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json(
      { error: 'Paramètre "?slug=..." manquant dans l\'URL' },
      { status: 400 }
    )
  }

  try {
    const sticker = await db.getStickerBySlug(slug)
    if (!sticker) {
      return NextResponse.json(
        { error: `Sticker introuvable pour le slug "${slug}"` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      slug: sticker.slug,
      targetUrl: sticker.targetUrl,
      label: sticker.label,
      active: sticker.active,
      scanCount: sticker.scanCount,
      updatedAt: sticker.updatedAt,
    })
  } catch (error) {
    console.error('[GET /api/save-link]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du sticker' },
      { status: 500 }
    )
  }
}
