import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-google'
import { db } from '@/lib/db'
import { sendReferralBonusEmail } from '@/lib/email'

/**
 * POST /api/my/referral — applique un code de parrainage (email du parrain)
 *
 * Body : { referrerEmail: string }
 *
 * Le parrain reçoit +1000 FCFA, le filleul +500 FCFA (bonus de bienvenue).
 * Un seul parrainage par utilisateur (vérifié dans db.applyReferral).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const referrerEmail = String(body.referrerEmail || '').trim()
    if (!referrerEmail) {
      return NextResponse.json({ error: 'Email de parrain requis' }, { status: 400 })
    }

    const result = await db.applyReferral(session.user.email, referrerEmail)
    if (!result) {
      return NextResponse.json({
        ok: false,
        reason: 'already_referred_or_invalid',
        message: 'Parrainage déjà appliqué ou email invalide',
      })
    }

    // 📧 Emails de confirmation de bonus (parrain + filleul)
    sendReferralBonusEmail(referrerEmail, 'parrain', 1000, session.user.email)
      .catch((e) => console.error('[email] Erreur envoi referral-parrain:', e))
    sendReferralBonusEmail(session.user.email, 'filleul', 500, referrerEmail)
      .catch((e) => console.error('[email] Erreur envoi referral-filleul:', e))

    return NextResponse.json({
      ok: true,
      bonusReceived: 500,
      message: 'Parrainage appliqué ! +500 FCFA crédités sur votre solde.',
    })
  } catch (error) {
    console.error('[POST /api/my/referral]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * GET /api/my/referral — récupère l'email du parrain (si déjà parrainé)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }
  try {
    const referrerEmail = await db.getReferral(session.user.email)
    return NextResponse.json({
      referrerEmail,
      alreadyReferred: !!referrerEmail,
    })
  } catch (error) {
    console.error('[GET /api/my/referral]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
