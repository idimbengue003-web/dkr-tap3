import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkPaymentReceived, isWaveConfigured } from '@/lib/wave'

/**
 * GET /api/orders/[id]/check-payment — PUBLIC
 *
 * Vérifie AUTOMATIQUEMENT si un paiement Wave correspondant au montant de la
 * commande a été reçu dans les N dernières minutes via l'API GraphQL Wave Business.
 *
 * Si paiement détecté :
 * - Marque la commande comme "paid" (status = 'paid')
 * - Crée automatiquement les stickers associés (1 par carte achetée)
 * - L'acheteur peut ensuite les retrouver dans /account et configurer leur URL
 *
 * Utilisé par le polling automatique du cart-drawer après que le client clique
 * "Payer avec Wave" — pas besoin de webhook !
 *
 * Sécurité : l'ID de commande (`ord_xxx`) est difficile à deviner. L'endpoint
 * ne renvoie que le statut, pas les détails de transaction.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const order = await db.getOrder(id)

    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    // Si déjà payée → on renvoie directement le statut (pas de double appel à l'API Wave)
    if (order.status === 'paid' || order.status === 'confirmed') {
      return NextResponse.json({
        status: order.status,
        paid: true,
        alreadyPaid: true,
        amount: order.totalAfter,
        paidAt: order.paidAt,
      })
    }

    // Si annulée → on ne vérifie pas
    if (order.status === 'cancelled') {
      return NextResponse.json({
        status: 'cancelled',
        paid: false,
      })
    }

    // Vérifier que l'API Wave est configurée
    if (!isWaveConfigured()) {
      return NextResponse.json({
        status: 'pending',
        paid: false,
        error: 'WAVE_API_TOKEN non configuré — vérification impossible',
      })
    }

    // Vérifier via l'API Wave GraphQL si un paiement du montant exact a été reçu
    // dans les 30 dernières minutes (fenêtre large pour éviter les faux négatifs)
    const expectedAmount = order.totalAfter
    const minutesWindow = 30
    const result = await checkPaymentReceived(expectedAmount, minutesWindow)

    if (result.received) {
      // Paiement détecté → marquer la commande comme payée
      // ⚠️ db.updateOrderStatus('paid') crée AUTOMATIQUEMENT les stickers associés
      // pour les commandes 'order', et active les stickers existants
      // Pour les commandes 'recharge' → addWalletTransaction est appelé ci-dessous
      const updated = await db.updateOrderStatus(id, 'paid')

      // Si c'est une recharge → ajouter le montant au solde wallet de l'acheteur
      if (order.type === 'recharge' && order.customerName) {
        try {
          await db.addWalletTransaction(
            order.customerName,
            'deposit',
            order.totalAfter, // positif = ajoute au solde
            id
          )
          console.log(
            `[check-payment] ✓ Recharge ${id} — ${order.totalAfter} FCFA ajoutés au wallet de ${order.customerName}`
          )
        } catch (e) {
          console.error('[check-payment] Erreur ajout wallet pour recharge', id, e)
        }
      } else {
        console.log(
          `[check-payment] ✓ Commande ${id} marquée "paid" — montant ${expectedAmount} FCFA reçu via Wave (tx: ${result.transactionId || 'N/A'})`
        )
      }
      return NextResponse.json({
        status: 'paid',
        paid: true,
        justPaid: true,
        amount: expectedAmount,
        type: order.type || 'order',
        transactionId: result.transactionId || null,
        paidAt: updated?.paidAt || new Date().toISOString(),
      })
    }

    // Toujours en attente
    return NextResponse.json({
      status: 'pending',
      paid: false,
      amount: expectedAmount,
      withinMinutes: minutesWindow,
      lastChecked: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[GET /api/orders/[id]/check-payment]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du paiement' },
      { status: 500 }
    )
  }
}
