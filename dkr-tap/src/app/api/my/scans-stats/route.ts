import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-google'
import { db } from '@/lib/db'

/**
 * GET /api/my/scans-stats — statistiques de scans pour l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }
  try {
    const stickers = await db.listStickersByBuyerEmail(session.user.email)
    const totalScans = stickers.reduce((s, st) => s + (st.scanCount || 0), 0)

    const topStickers = [...stickers]
      .sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0))
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        slug: s.slug,
        label: s.label,
        scanCount: s.scanCount || 0,
        targetUrl: s.targetUrl,
        active: s.active,
      }))

    return NextResponse.json({
      totalScans,
      totalStickers: stickers.length,
      activeStickers: stickers.filter((s) => s.active).length,
      pendingStickers: stickers.filter((s) => !s.active).length,
      configuredStickers: stickers.filter((s) => s.targetUrl).length,
      unconfiguredStickers: stickers.length - stickers.filter((s) => s.targetUrl).length,
      topStickers,
    })
  } catch (error) {
    console.error('[GET /api/my/scans-stats]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
