import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-google'
import { db, LOYALTY_REWARDS } from '@/lib/db'

/**
 * POST /api/my/loyalty/redeem — échange des points contre une récompense
 *
 * Body: { rewardId: string }
 *
 * Récompenses :
 * - 'free_sticker' : 10 points = 1 sticker gratuit
 * - 'free_pack_12' : 50 points = 12 stickers gratuits
 * - 'free_pack_25' : 100 points = 25 stickers gratuits
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const rewardId = String(body.rewardId || '').trim()
    const reward = LOYALTY_REWARDS.find((r) => r.id === rewardId)

    if (!reward) {
      return NextResponse.json({ error: 'Récompense introuvable' }, { status: 400 })
    }

    // Échanger les points (crée les stickers automatiquement)
    const { account, stickers } = await db.redeemLoyaltyPoints(
      session.user.email,
      reward.pointsCost,
      reward.label,
      reward.stickerCount
    )

    console.log(
      `[loyalty] ✓ ${session.user.email} a échangé ${reward.pointsCost} points → ${reward.stickerCount} stickers (${stickers.length} créés)`
    )

    return NextResponse.json({
      ok: true,
      reward: reward.label,
      pointsSpent: reward.pointsCost,
      remainingPoints: account.points,
      stickersCreated: stickers.length,
      stickerSlugs: stickers.map((s) => s.slug),
      message: `Récompense échangée ! ${reward.stickerCount} sticker(s) créé(s) dans votre compte.`,
    })
  } catch (error: any) {
    console.error('[POST /api/my/loyalty/redeem]', error)
    if (error?.message?.includes('insuffisant')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
