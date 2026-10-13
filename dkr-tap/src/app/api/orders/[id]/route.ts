import { NextRequest, NextResponse } from 'next/server'
import { db, type OrderStatus } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/orders/[id] — admin only (détail d'une commande)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard
  try {
    const { id } = await params
    const order = await db.getOrder(id)
    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    console.error('[GET /api/orders/[id]]', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

// PATCH /api/orders/[id] — admin only (met à jour le statut)
// Corps : { status: 'pending' | 'paid' | 'confirmed' | 'cancelled' }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body
    const validStatuses: OrderStatus[] = ['pending', 'paid', 'confirmed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }
    const updated = await db.updateOrderStatus(id, status)
    if (!updated) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/orders/[id]]', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

// DELETE /api/orders/[id] — admin only (supprime une commande)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard
  try {
    const { id } = await params
    const ok = await db.deleteOrder(id)
    if (!ok) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/orders/[id]]', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
