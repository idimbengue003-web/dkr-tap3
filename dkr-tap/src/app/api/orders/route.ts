import { NextRequest, NextResponse } from 'next/server'
import { db, type OrderInput, type OrderItem } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/orders — admin only (liste toutes les commandes)
export async function GET(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard
  try {
    const orders = await db.listOrders()
    return NextResponse.json(orders)
  } catch (error) {
    console.error('[GET /api/orders]', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 })
  }
}

// POST /api/orders — PUBLIC (les revendeurs créent leur commande avant paiement Wave)
// Corps attendu : OrderInput (items[], totalQty, totalBefore, totalAfter, discountPct, customerName?, customerPhone?, customerNote?)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation minimale
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 })
    }
    if (typeof body.totalQty !== 'number' || body.totalQty < 1) {
      return NextResponse.json({ error: 'totalQty invalide' }, { status: 400 })
    }
    if (typeof body.totalAfter !== 'number' || body.totalAfter < 0) {
      return NextResponse.json({ error: 'totalAfter invalide' }, { status: 400 })
    }

    // Valider chaque item
    const items: OrderItem[] = body.items.map((it: any) => ({
      key: String(it.key || ''),
      name: String(it.name || ''),
      parentName: it.parentName ? String(it.parentName) : undefined,
      price: Number(it.price) || 0,
      unitPrice: Number(it.unitPrice) || 0,
      qty: Math.max(1, Number(it.qty) || 1),
      imagePath: typeof it.imagePath === 'string' ? it.imagePath : null,
    }))

    const input: OrderInput = {
      items,
      totalQty: body.totalQty,
      totalBefore: typeof body.totalBefore === 'number' ? body.totalBefore : body.totalAfter,
      totalAfter: body.totalAfter,
      discountPct: typeof body.discountPct === 'number' ? body.discountPct : 0,
      paymentMethod: body.paymentMethod === 'call' || body.paymentMethod === 'other' ? body.paymentMethod : 'wave',
      customerName: typeof body.customerName === 'string' && body.customerName.trim() ? body.customerName.trim() : null,
      customerPhone: typeof body.customerPhone === 'string' && body.customerPhone.trim() ? body.customerPhone.trim() : null,
      customerNote: typeof body.customerNote === 'string' && body.customerNote.trim() ? body.customerNote.trim() : null,
    }

    const order = await db.createOrder(input)
    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('[POST /api/orders]', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }
}
