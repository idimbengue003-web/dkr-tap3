import { NextRequest, NextResponse } from 'next/server'
import { db, type OrderInput, type OrderItem } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sendOrderCreatedEmail, sendAdminNewOrderEmail } from '@/lib/email'

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
// Rate limit : 5 commandes / IP / heure pour éviter le spam
export async function POST(request: NextRequest) {
  // Rate limiting
  const limit = await checkRateLimit(request, 'orders-create', 5, 60 * 60)
  if (limit.exceeded) return rateLimitResponse(limit.resetAt)

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
    // ⚡ Créer immédiatement les stickers associés (active=false car pas encore payé)
    // → l'acheteur peut les voir dans /account tout de suite et pré-configurer les URLs
    // → ils seront activés (active=true) automatiquement quand la commande passera en 'paid'
    try {
      await db.createStickersForOrder(order.id, false)
    } catch (e) {
      console.error('[POST /api/orders] Erreur création stickers initiaux pour', order.id, e)
      // Ne pas faire échouer la création de commande pour autant
    }
    // 📧 Email de confirmation de création de commande (au client)
    if (input.customerName && input.customerName.includes('@')) {
      sendOrderCreatedEmail(input.customerName, {
        id: order.id,
        totalAfter: order.totalAfter,
        totalQty: order.totalQty,
        discountPct: order.discountPct,
        items: order.items,
      }).catch((e) => console.error('[email] Erreur envoi order-created:', e))
    }
    // 📧 Email NOTIFICATION ADMIN (à toi-même)
    sendAdminNewOrderEmail(
      order.id,
      order.totalAfter,
      order.totalQty,
      input.customerName || null,
      input.customerPhone || null,
      order.items.map((it) => ({ name: it.name, qty: it.qty, unitPrice: it.unitPrice }))
    ).catch((e) => console.error('[email] Erreur envoi admin notification:', e))
    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('[POST /api/orders]', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }
}
