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
//   - sinon → affiche une page d'attente avec message "sticker non configuré"
//
// Les couleurs de la page s'adaptent au réseau du sticker :
//   - Google → fond clair, accents bleus
//   - TikTok → fond noir, accents cyan/rose
//   - Instagram → dégradé violet-rose-jaune
//   - Aucun réseau → thème sombre générique avec accent emerald
//
// Le scanCount est incrémenté atomiquement via store.incr() (clé séparée scans:<slug>).
//
// Stockage : Vercel KV (Redis) en production, MockKV en mémoire en dev local.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Récupérer le sticker par son slug
  const sticker = await db.getStickerBySlug(slug)

  const configured = !!sticker && !!sticker.targetUrl && sticker.active
  const targetUrl =
    configured && sticker?.targetUrl ? sticker.targetUrl : null

  // Incrémenter le compteur de scans (atomique via store.incr)
  // + loguer l'événement (analytics "activité récente" dans l'admin)
  // Uniquement si le sticker existe, pour ne pas polluer KV
  if (sticker) {
    db.incrementScanCount(slug).catch(() => {
      // Erreur non bloquante : la page s'affiche même si l'incrémentation échoue
    })
    db.logScan(slug, {
      targetUrl: sticker.targetUrl,
      label: sticker.label,
    }).catch(() => {
      // Idem : erreur non bloquante
    })
  }

  // Déterminer le réseau effectif (custom si fourni, sinon auto-détecté depuis l'URL)
  const effectiveNetwork = sticker
    ? getEffectiveNetwork(sticker.targetUrl, sticker.customNetwork ?? null)
    : null

  // Rendre la page HTML d'attente (avec thème selon le réseau)
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
      // Empêcher l'iframe embedding (protection clickjacking sur la page de transit)
      'X-Frame-Options': 'DENY',
    },
  })
}
