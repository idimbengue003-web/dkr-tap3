import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/r/[slug]
// Redirige immédiatement vers l'URL cible du sticker.
// Si le sticker n'existe pas ou n'a pas d'URL cible -> page d'attente.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // 1. Chercher le sticker par son slug
  const sticker = await db.sticker.findUnique({
    where: { slug },
  })

  // 2. Si le sticker n'existe pas ou n'a pas d'URL cible, rediriger vers page d'attente
  if (!sticker || !sticker.targetUrl || !sticker.active) {
    const url = new URL('/not-configured', request.url)
    url.searchParams.set('slug', slug)
    return NextResponse.redirect(url)
  }

  // 3. Incrémenter le compteur de scans en arrière-plan (fire-and-forget)
  db.sticker
    .update({
      where: { id: sticker.id },
      data: { scanCount: { increment: 1 } },
    })
    .catch(() => {})

  // 4. Redirection instantanée vers l'URL cible (TikTok, Google, etc.)
  return NextResponse.redirect(sticker.targetUrl, { status: 302 })
}
