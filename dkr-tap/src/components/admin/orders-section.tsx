'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { RefreshCw, Trash2, Eye, ShoppingBag, Phone, User } from 'lucide-react'

type OrderStatus = 'pending' | 'paid' | 'confirmed' | 'cancelled'

type OrderItem = {
  key: string
  name: string
  parentName?: string
  price: number
  unitPrice: number
  qty: number
  imagePath: string | null
}

type Order = {
  id: string
  items: OrderItem[]
  totalQty: number
  totalBefore: number
  totalAfter: number
  discountPct: number
  status: OrderStatus
  paymentMethod: 'wave' | 'call' | 'other'
  customerName: string | null
  customerPhone: string | null
  customerNote: string | null
  createdAt: string
  updatedAt: string
  paidAt: string | null
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'En attente',
  paid: 'Payée',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatFCFA(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

export function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (e) {
      console.error('Erreur chargement commandes', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const updateStatus = async (id: string, status: OrderStatus) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const updated = await res.json()
        setOrders((cur) => cur.map((o) => (o.id === id ? updated : o)))
        if (selectedOrder?.id === id) setSelectedOrder(updated)
      }
    } catch (e) {
      console.error('Erreur MAJ statut', e)
    } finally {
      setUpdating(null)
    }
  }

  const deleteOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setOrders((cur) => cur.filter((o) => o.id !== id))
      }
    } catch (e) {
      console.error('Erreur suppression', e)
    }
    setDeleteId(null)
  }

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  // Stats rapides
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    paid: orders.filter((o) => o.status === 'paid').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
    revenue: orders
      .filter((o) => o.status === 'paid' || o.status === 'confirmed')
      .reduce((s, o) => s + o.totalAfter, 0),
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Commandes reçues</CardTitle>
          <p className="text-xs text-zinc-500 mt-1">
            {stats.total} commande{stats.total > 1 ? 's' : ''} • {stats.paid + stats.confirmed} payée{stats.paid + stats.confirmed > 1 ? 's' : ''} •{' '}
            <span className="text-emerald-600 font-semibold">{formatFCFA(stats.revenue)}</span> de CA
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadOrders} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="ml-1.5">Rafraîchir</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Toutes ({stats.total})
          </Button>
          <Button
            size="sm"
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            En attente ({stats.pending})
          </Button>
          <Button
            size="sm"
            variant={filter === 'paid' ? 'default' : 'outline'}
            onClick={() => setFilter('paid')}
          >
            Payées ({stats.paid})
          </Button>
          <Button
            size="sm"
            variant={filter === 'confirmed' ? 'default' : 'outline'}
            onClick={() => setFilter('confirmed')}
          >
            Confirmées ({stats.confirmed})
          </Button>
          <Button
            size="sm"
            variant={filter === 'cancelled' ? 'default' : 'outline'}
            onClick={() => setFilter('cancelled')}
            className="text-red-600"
          >
            Annulées ({stats.cancelled})
          </Button>
        </div>

        {/* Liste */}
        {loading ? (
          <p className="text-center text-zinc-500 text-sm py-8">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
              <ShoppingBag size={24} />
            </div>
            <p className="text-sm text-zinc-600 mb-1">Aucune commande pour l'instant</p>
            <p className="text-xs text-zinc-400">
              Les commandes créées par les revendeurs depuis le panier apparaîtront ici automatiquement.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((o) => (
              <div
                key={o.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors"
              >
                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs text-zinc-500">{o.id}</span>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </Badge>
                    <span className="text-xs text-zinc-400">• {formatDate(o.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-zinc-900">{formatFCFA(o.totalAfter)}</span>
                    <span className="text-xs text-zinc-500">
                      {o.totalQty} carte{o.totalQty > 1 ? 's' : ''}
                      {o.discountPct > 0 && <span className="text-emerald-600"> (-{o.discountPct}%)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    {o.customerName && (
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        {o.customerName}
                      </span>
                    )}
                    {o.customerPhone && (
                      <span className="flex items-center gap-1">
                        <Phone size={11} />
                        {o.customerPhone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                    disabled={updating === o.id}
                    className="text-xs px-2 py-1.5 rounded-md border border-zinc-300 bg-white hover:border-zinc-400 disabled:opacity-50"
                  >
                    <option value="pending">En attente</option>
                    <option value="paid">Payée</option>
                    <option value="confirmed">Confirmée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(o)} title="Voir le détail">
                    <Eye size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteId(o.id)}
                    title="Supprimer"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal détail */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail de la commande</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-zinc-500">{selectedOrder.id}</p>
                  <p className="text-sm text-zinc-700 mt-0.5">{formatDate(selectedOrder.createdAt)}</p>
                </div>
                <Badge variant="outline" className={STATUS_COLOR[selectedOrder.status]}>
                  {STATUS_LABEL[selectedOrder.status]}
                </Badge>
              </div>

              {/* Client */}
              {(selectedOrder.customerName || selectedOrder.customerPhone) && (
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Client</p>
                  {selectedOrder.customerName && (
                    <p className="text-sm flex items-center gap-1.5">
                      <User size={13} /> {selectedOrder.customerName}
                    </p>
                  )}
                  {selectedOrder.customerPhone && (
                    <p className="text-sm flex items-center gap-1.5">
                      <Phone size={13} />
                      <a href={`tel:${selectedOrder.customerPhone}`} className="text-blue-600 hover:underline">
                        {selectedOrder.customerPhone}
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Contenu</p>
                <div className="space-y-1.5">
                  {selectedOrder.items.map((it) => (
                    <div key={it.key} className="flex items-center justify-between text-sm gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="truncate">
                          {it.parentName && <span className="text-zinc-500 text-xs">{it.parentName} › </span>}
                          {it.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {it.qty} × {formatFCFA(it.unitPrice)}
                          {it.unitPrice < it.price && (
                            <span className="line-through text-zinc-400 ml-1">{formatFCFA(it.price)}</span>
                          )}
                        </p>
                      </div>
                      <span className="font-semibold">{formatFCFA(it.unitPrice * it.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totaux */}
              <div className="border-t pt-3 space-y-1.5">
                {selectedOrder.discountPct > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Sous-total</span>
                      <span className="line-through text-zinc-400">{formatFCFA(selectedOrder.totalBefore)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Remise ({selectedOrder.discountPct}%)</span>
                      <span className="text-emerald-600">
                        -{formatFCFA(selectedOrder.totalBefore - selectedOrder.totalAfter)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>Total payé</span>
                  <span className="text-emerald-600">{formatFCFA(selectedOrder.totalAfter)}</span>
                </div>
              </div>

              {/* Sélecteur statut rapide */}
              <div className="flex gap-1.5 pt-2">
                <Button
                  size="sm"
                  variant={selectedOrder.status === 'paid' ? 'default' : 'outline'}
                  onClick={() => updateStatus(selectedOrder.id, 'paid')}
                  disabled={updating === selectedOrder.id}
                  className="flex-1"
                >
                  Marquer payée
                </Button>
                <Button
                  size="sm"
                  variant={selectedOrder.status === 'confirmed' ? 'default' : 'outline'}
                  onClick={() => updateStatus(selectedOrder.id, 'confirmed')}
                  disabled={updating === selectedOrder.id}
                  className="flex-1"
                >
                  Confirmer
                </Button>
                <Button
                  size="sm"
                  variant={selectedOrder.status === 'cancelled' ? 'destructive' : 'outline'}
                  onClick={() => updateStatus(selectedOrder.id, 'cancelled')}
                  disabled={updating === selectedOrder.id}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm suppression */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La commande sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteOrder(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
