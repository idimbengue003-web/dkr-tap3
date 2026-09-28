import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderWaitingPage } from '@/lib/redirect-page'

export const dynamic = 'force-dynamic'

// GET /api/r/[slug]
// Renvoie une page HTML d'attente professionnelle (200 OK) qui :
//   - si le sticker est configuré et actif → affiche "Connexion sécurisée
//     via [COMPANY_NAME]... Redirection vers la page du commerçant." et
//     redirige automatiquement après ~600ms (meta refresh + JS fallback)
//   - sinon → affiche une page d'attente avec message "sticker non configuré"
//
// Le scanCount est incrémenté au moment du rendu (un seul appel DB).
//
// Renvoie explicitement Content-Type: text/html pour que le navigateur
// interprète la réponse comme une page.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Récupérer le sticker
  const sticker = await db.sticker.findUnique({
    where: { slug },
  })

  const configured = !!sticker && !!sticker.targetUrl && sticker.active
  const targetUrl = configured && sticker?.targetUrl ? sticker.targetUrl : null

  // Incrémenter le compteur de scans uniquement si le sticker existe
  // (pour éviter de polluer la DB avec des scans de stickers inconnus)
  if (sticker) {
    db.sticker
      .update({
        where: { id: sticker.id },
        data: { scanCount: { increment: 1 } },
      })
      .catch(() => {
        // Erreur non bloquante : la page s'affiche même si l'incrémentation échoue
      })
  }

  // Rendre la page HTML d'attente
  const html = renderWaitingPage({
    targetUrl,
    slug,
    configured,
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
