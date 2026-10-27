import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/promo-codes/validate — PUBLIC
 * Valide un code promo et renvoie les infos de réduction (sans l'utiliser)
 *
 * Body: { code: string }
 * Retourne: { valid: true, code, discountType, discountValue, description }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = String(body.code || '').trim()
    if (!code) {
      return NextResponse.json({ valid: false, error: 'Code requis' }, { status: 400 })
    }

    const promo = await db.validatePromoCode(code)
    if (!promo) {
      return NextResponse.json({ valid: false, error: 'Code invalide, expiré ou épuisé' }, { status: 404 })
    }

    return NextResponse.json({
      valid: true,
      code: promo.code,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    })
  } catch (error) {
    console.error('[POST /api/promo-codes/validate]', error)
    return NextResponse.json({ valid: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
