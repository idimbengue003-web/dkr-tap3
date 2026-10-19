import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-google'
import { db } from '@/lib/db'

/**
 * POST /api/orders/[id]/pay-from-wallet — auth requis (Google)
 *
 * Paye une commande avec le solde wallet de l'utilisateur connecté.
 * - Vérifie que la commande est 'pending' et appartient à l'utilisateur
 * - Vérifie que le solde est suffisant
 * - Débite le wallet (addWalletTransaction avec amount négatif)
 * - Marque la commande comme 'paid' (ce qui active les stickers automatiquement)
 *
 * Pas de polling Wave nécessaire — paiement instantané !
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const { id } = await params
  const order = await db.getOrder(id)
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  // Vérifier que la commande appartient à l'utilisateur
  const userEmail = session.user.email.toLowerCase()
  const belongsToUser =
    (order.customerName || '').toLowerCase().includes(userEmail) ||
    (order.customerPhone || '').toLowerCase() === userEmail
  if (!belongsToUser) {
    return NextResponse.json({ error: 'Cette commande ne vous appartient pas' }, { status: 403 })
  }

  // Vérifier que la commande est en attente (pas déjà payée)
  if (order.status !== 'pending') {
    return NextResponse.json(
      { error: `Commande déjà au statut "${order.status}"` },
      { status: 400 }
    )
  }

  // Vérifier le solde
  const wallet = await db.getWallet(session.user.email)
  if (wallet.balance < order.totalAfter) {
    return NextResponse.json(
      {
        error: 'Solde insuffisant',
        balance: wallet.balance,
        needed: order.totalAfter,
        missing: order.totalAfter - wallet.balance,
      },
      { status: 400 }
    )
  }

  try {
    // Débiter le wallet (amount négatif pour order_payment)
    await db.addWalletTransaction(
      session.user.email,
      'order_payment',
      -order.totalAfter, // négatif = débit
      id
    )

    // Marquer la commande comme payée (active les stickers si commande 'order')
    await db.updateOrderStatus(id, 'paid')

    console.log(
      `[pay-from-wallet] ✓ Commande ${id} payée avec solde wallet — ${order.totalAfter} FCFA débités`
    )

    return NextResponse.json({
      ok: true,
      orderId: id,
      status: 'paid',
      amount: order.totalAfter,
      newBalance: wallet.balance - order.totalAfter,
    })
  } catch (error) {
    console.error('[POST /api/orders/[id]/pay-from-wallet]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
