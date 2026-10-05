import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/stats
// Récupère les statistiques détaillées pour le dashboard admin :
//   - topStickers : top 5 par scanCount
//   - recentScans : 5 derniers scans (slug + timestamp + URL snapshot)
// Auth requis (pas de fuite d'infos publiques).
export async function GET(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  try {
    const all = await db.listStickers()

    // Top 5 par scanCount desc
    const topStickers = [...all]
      .sort((a, b) => b.scanCount - a.scanCount)
      .slice(0, 5)
      .map((s) => ({
        slug: s.slug,
        label: s.label,
        targetUrl: s.targetUrl,
        scanCount: s.scanCount,
        active: s.active,
      }))

    // 5 derniers scans
    const recentScans = await db.getRecentScans(5)

    // Stats globales
    const total = all.length
    const configured = all.filter((s) => !!s.targetUrl).length
    const blank = total - configured
    const totalScans = all.reduce((acc, s) => acc + s.scanCount, 0)
    const activeStickers = all.filter((s) => s.active).length
    const avgScans = total > 0 ? Math.round(totalScans / total) : 0

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary: {
        total,
        configured,
        blank,
        active: activeStickers,
        totalScans,
        avgScansPerSticker: avgScans,
      },
      topStickers,
      recentScans,
    })
  } catch (error) {
    console.error('[GET /api/stats]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}
