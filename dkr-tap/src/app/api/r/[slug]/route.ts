import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderWaitingPage } from '@/lib/redirect-page'
import { getEffectiveNetwork } from '@/lib/sticker-template'

export const dynamic = 'force-dynamic'

// GET /api/r/[slug]
// Renvoie une page HTML d'attente professionnelle (200 OK) qui :
//   - si le sticker est configuré et actif → affiche "Connexion sécurisée
//     via [BRAND]... Redirection vers la page du commerçant." et
//     redirige automatiquement après ~600ms (meta refresh + JS fallback)
//   - si le sticker existe mais n'a pas d'URL configurée → REDIRIGE vers
//     /configure/[slug] (page de configuration première utilisation)
//   - sinon → affiche une page d'attente avec message "sticker introuvable"
//
// Les couleurs de la page s'adaptent au réseau du sticker.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Récupérer le sticker par son slug
  const sticker = await db.getStickerBySlug(slug)

  // Si le sticker n'existe pas → page d'erreur
  if (!sticker) {
    const html = renderWaitingPage({
      targetUrl: null,
      slug,
      configured: false,
      network: null,
    })
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Frame-Options': 'DENY',
      },
    })
  }

  // Incrémenter le compteur de scans
  db.incrementScanCount(slug).catch(() => {})
  db.logScan(slug, {
    targetUrl: sticker.targetUrl,
    label: sticker.label,
  }).catch(() => {})

  // ⭐ Si le sticker existe mais n'a PAS d'URL configurée → page de configuration
  if (sticker.active && !sticker.targetUrl) {
    const configureUrl = new URL(`/configure/${slug}`, request.url)
    return NextResponse.redirect(configureUrl, 302)
  }

  // Si le sticker est configuré et actif → page d'attente + redirection
  const configured = !!sticker.targetUrl && sticker.active
  const targetUrl = configured ? sticker.targetUrl : null
  const effectiveNetwork = getEffectiveNetwork(
    sticker.targetUrl,
    sticker.customNetwork ?? null
  )

  const html = renderWaitingPage({
    targetUrl,
    slug,
    configured,
    network: effectiveNetwork,
  })

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
    },
  })
}
