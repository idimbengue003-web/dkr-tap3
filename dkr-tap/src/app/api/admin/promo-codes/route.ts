import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/admin/promo-codes — liste tous les codes promo (admin)
export async function GET(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard
  try {
    const promos = await db.listPromoCodes()
    return NextResponse.json(promos)
  } catch (error) {
    console.error('[GET /api/admin/promo-codes]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/admin/promo-codes — crée un code promo (admin)
export async function POST(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard
  try {
    const body = await request.json()
    const { code, description, discountType, discountValue, maxUses, expiresAt } = body

    if (!code?.trim()) {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 })
    }
    if (!['percentage', 'fixed'].includes(discountType)) {
      return NextResponse.json({ error: 'Type de remise invalide' }, { status: 400 })
    }
    if (typeof discountValue !== 'number' || discountValue <= 0) {
      return NextResponse.json({ error: 'Valeur de remise invalide' }, { status: 400 })
    }

    const promo = await db.createPromoCode({
      code: code.trim(),
      description: description || '',
      discountType,
      discountValue,
      maxUses: typeof maxUses === 'number' ? maxUses : 0,
      expiresAt: expiresAt || null,
    })

    return NextResponse.json(promo, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/promo-codes]', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}

// DELETE /api/admin/promo-codes?code=XXX — supprime un code promo (admin)
export async function DELETE(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    if (!code) {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 })
    }
    const ok = await db.deletePromoCode(code)
    if (!ok) {
      return NextResponse.json({ error: 'Code introuvable' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/admin/promo-codes]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
