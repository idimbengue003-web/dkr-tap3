'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, ShoppingBag, Trash2, Sparkles, CheckCircle2 } from 'lucide-react'

type Category = {
  id: string
  name: string
  network: string | null
  description: string | null
  price: number
  imagePath: string | null
}

type Props = {
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CartItem = {
  /** Clé unique: 'cat:<id>' pour catégorie entière, 'mod:<id>' pour modèle individuel */
  key: string
  /** Nom affiché dans le panier */
  name: string
  /** Nom de la catégorie parente (pour les modèles) */
  parentName?: string
  price: number
  imagePath: string | null
  qty: number
}

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'
const WAVE_BASE_URL = process.env.NEXT_PUBLIC_WAVE_PAYMENT_URL || '#'

const STORAGE_KEY = 'dkr-tap-cart-v2'

// Prix dégressifs par quantité (basé sur le TOTAL des cartes du panier)
function getUnitPrice(basePrice: number, totalQty: number): number {
  if (totalQty >= 20) return Math.round(basePrice * 0.5) // 50% du prix
  if (totalQty >= 10) return Math.round(basePrice * 0.83) // ~17% de remise
  return basePrice
}

function getDiscountPct(totalQty: number): number {
  if (totalQty >= 20) return 50
  if (totalQty >= 10) return 17
  return 0
}

function buildWaveUrl(amount: number): string {
  if (WAVE_BASE_URL === '#') return '#'
  const base = WAVE_BASE_URL.replace(/\/$/, '')
  return `${base}?amount=${amount}`
}

type CartState = Record<string, CartItem>

// Événement personnalisé pour ajouter un item depuis d'autres composants
// Usage: window.dispatchEvent(new CustomEvent('cart:add', { detail: { ...item } }))
type CartAddEvent = {
  key: string
  name: string
  parentName?: string
  price: number
  imagePath: string | null
  qty?: number
}

export function CartDrawer({ categories, open, onOpenChange }: Props) {
  const [cart, setCart] = useState<CartState>({})
  const [justAdded, setJustAdded] = useState<string | null>(null)

  // Charger le panier depuis localStorage au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          setCart(parsed)
        }
      }
    } catch {}
  }, [])

  // Sauvegarder dans localStorage à chaque modification
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    } catch {}
  }, [cart])

  // Écouter les événements cart:add depuis d'autres composants (ex: CategoryShop)
  useEffect(() => {
    const onAdd = (e: Event) => {
      const detail = (e as CustomEvent<CartAddEvent>).detail
      if (!detail || !detail.key) return
      setCart((prev) => {
        const next = { ...prev }
        const existing = next[detail.key]
        const newQty = (existing?.qty || 0) + (detail.qty || 1)
        next[detail.key] = {
          key: detail.key,
          name: detail.name,
          parentName: detail.parentName,
          price: detail.price,
          imagePath: detail.imagePath,
          qty: Math.min(99, newQty),
        }
        return next
      })
      // Petit feedback visuel
      setJustAdded(detail.key)
      setTimeout(() => setJustAdded((k) => (k === detail.key ? null : k)), 1500)
    }
    window.addEventListener('cart:add', onAdd as EventListener)
    return () => window.removeEventListener('cart:add', onAdd as EventListener)
  }, [])

  // Bloquer le scroll body quand le drawer est ouvert
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Calcul du total quantité + total prix
  const { totalQty, items, totalBefore, totalAfter, discountPct } = useMemo(() => {
    let totalQty = 0
    let totalBefore = 0
    let totalAfter = 0

    // D'abord calculer le total qty
    const items = Object.values(cart)
    items.forEach((it) => {
      totalQty += it.qty
    })

    // Ensuite appliquer la remise sur chaque item
    items.forEach((it) => {
      const unitPrice = getUnitPrice(it.price, totalQty)
      totalBefore += it.price * it.qty
      totalAfter += unitPrice * it.qty
    })

    const discountPct = getDiscountPct(totalQty)
    return { totalQty, items, totalBefore, totalAfter, discountPct }
  }, [cart])

  // Identifier les catégories par nom (pour le preset Pack Revendeur)
  const findCatIdByName = useCallback(
    (name: string) => categories.find((c) => c.name.toLowerCase().includes(name.toLowerCase()))?.id,
    [categories]
  )

  const setQty = (key: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev }
      if (qty <= 0) {
        delete next[key]
      } else {
        const existing = next[key]
        if (existing) {
          next[key] = { ...existing, qty: Math.min(99, qty) }
        }
      }
      return next
    })
  }

  const inc = (key: string) => setQty(key, (cart[key]?.qty || 0) + 1)
  const dec = (key: string) => setQty(key, (cart[key]?.qty || 0) - 1)

  const applyPackRevendeur = () => {
    const next: CartState = {}
    const igId = findCatIdByName('Instagram')
    const snapId = findCatIdByName('Snap')
    const fbId = findCatIdByName('Facebook')
    const ytId = findCatIdByName('YouTube')

    const buildCatItem = (catId: string, qty: number): CartItem | null => {
      const cat = categories.find((c) => c.id === catId)
      if (!cat) return null
      return {
        key: `cat:${cat.id}`,
        name: cat.name,
        price: cat.price,
        imagePath: cat.imagePath,
        qty,
      }
    }

    if (igId) {
      const it = buildCatItem(igId, 5)
      if (it) next[it.key] = it
    }
    if (snapId) {
      const it = buildCatItem(snapId, 2)
      if (it) next[it.key] = it
    }
    if (fbId) {
      const it = buildCatItem(fbId, 3)
      if (it) next[it.key] = it
    }
    if (ytId) {
      const it = buildCatItem(ytId, 2)
      if (it) next[it.key] = it
    }

    // Fallback : prendre les 4 premières catégories
    if (Object.keys(next).length === 0 && categories.length >= 4) {
      const presets = [5, 2, 3, 2]
      categories.slice(0, 4).forEach((c, i) => {
        const it = buildCatItem(c.id, presets[i])
        if (it) next[it.key] = it
      })
    }

    setCart(next)
  }

  const clearCart = () => {
    if (confirm('Vider le panier ?')) setCart({})
  }

  // Trier les items : modèles d'abord (alpha par catégorie parente), puis catégories seules
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aParent = a.parentName || ''
      const bParent = b.parentName || ''
      if (aParent !== bParent) return aParent.localeCompare(bParent)
      return a.name.localeCompare(b.name)
    })
  }, [items])

  // Palier suivant pour atteindre la remise supérieure
  const nextTier = useMemo(() => {
    if (totalQty < 10) {
      return { threshold: 10, label: 'Remise 17% (10 cartes)', missing: 10 - totalQty }
    }
    if (totalQty < 20) {
      return { threshold: 20, label: 'Remise 50% (20 cartes)', missing: 20 - totalQty }
    }
    return null
  }, [totalQty])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 30 }}
            className="bg-zinc-950 border-t border-zinc-800 sm:border sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-emerald-400" />
                <h2 className="text-lg font-bold">Panier revendeur</h2>
                {totalQty > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-xs font-bold">
                    {totalQty} carte{totalQty > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                aria-label="Fermer le panier"
              >
                <X size={18} />
              </button>
            </div>

            {/* Bandeau Pack Revendeur */}
            <div className="p-4 border-b border-zinc-800 bg-gradient-to-r from-emerald-500/10 via-zinc-900 to-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={16} className="text-emerald-400" />
                    <p className="font-bold text-sm">Pack Revendeur recommandé</p>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    5 Instagram + 2 Snapchat + 3 Facebook + 2 YouTube = <strong className="text-white">12 cartes</strong>.
                    Débloque automatiquement la <strong className="text-emerald-400">remise volume de 17%</strong>.
                  </p>
                </div>
                <button
                  onClick={applyPackRevendeur}
                  className="shrink-0 px-3 py-2 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-colors whitespace-nowrap"
                >
                  Appliquer
                </button>
              </div>
            </div>

            {/* Liste des items */}
            <div className="flex-1 overflow-y-auto p-4">
              {sortedItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500">
                    <ShoppingBag size={28} />
                  </div>
                  <p className="text-zinc-400 mb-1">Votre panier est vide</p>
                  <p className="text-xs text-zinc-600">
                    Cliquez sur « Ajouter au panier » sur un modèle, ou utilisez le Pack Revendeur ci-dessus.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Grouper par catégorie parente */}
                  {(() => {
                    // Construire les groupes
                    const groups: { parentName: string; items: CartItem[] }[] = []
                    sortedItems.forEach((it) => {
                      const parent = it.parentName || '_cat'
                      let g = groups.find((g) => g.parentName === parent)
                      if (!g) {
                        g = { parentName: parent, items: [] }
                        groups.push(g)
                      }
                      g.items.push(it)
                    })
                    return groups.map((g) => (
                      <div key={g.parentName}>
                        {g.parentName !== '_cat' && (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 px-1">
                            {g.parentName}
                          </p>
                        )}
                        <div className="space-y-2">
                          {g.items.map((it) => {
                            const unitPrice = getUnitPrice(it.price, totalQty)
                            const isJustAdded = justAdded === it.key
                            return (
                              <div
                                key={it.key}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                  isJustAdded ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/50'
                                }`}
                              >
                                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                                  {it.imagePath ? (
                                    <img src={it.imagePath} alt={it.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xl">📦</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">{it.name}</p>
                                  <p className="text-xs text-zinc-500">
                                    {unitPrice.toLocaleString('fr-FR')} FCFA / carte
                                    {discountPct > 0 && (
                                      <span className="text-emerald-400 ml-1">(-{discountPct}%)</span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => dec(it.key)}
                                    className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                                    aria-label="Retirer"
                                  >
                                    {it.qty === 1 ? <Trash2 size={14} className="text-red-400" /> : <Minus size={14} />}
                                  </button>
                                  <span className="text-lg font-bold w-8 text-center">{it.qty}</span>
                                  <button
                                    onClick={() => inc(it.key)}
                                    className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                                    aria-label="Ajouter"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Footer : résumé + paiement */}
            <div className="border-t border-zinc-800 p-4 space-y-3">
              {totalQty === 0 ? (
                <p className="text-center text-zinc-500 text-sm py-2">
                  Sélectionnez vos modèles pour activer la remise volume.
                </p>
              ) : (
                <>
                  {/* Palier de remise */}
                  {discountPct > 0 ? (
                    <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <Sparkles size={14} />
                        Remise volume appliquée ({discountPct}%)
                      </span>
                      <span className="text-emerald-400 font-bold">
                        -{(totalBefore - totalAfter).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  ) : nextTier ? (
                    <div className="text-xs text-zinc-400 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                      Plus que <strong className="text-white">{nextTier.missing} carte{nextTier.missing > 1 ? 's' : ''}</strong> pour
                      débloquer : <strong className="text-emerald-400">{nextTier.label}</strong>
                    </div>
                  ) : null}

                  {/* Détail des montants */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Sous-total ({totalQty} cartes)</span>
                      <span className="text-zinc-300 line-through">{totalBefore.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    {discountPct > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-400">Remise ({discountPct}%)</span>
                        <span className="text-emerald-400">-{(totalBefore - totalAfter).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-2 border-t border-zinc-800">
                      <span className="font-bold text-white">Total à payer</span>
                      <span className="font-bold text-emerald-400 text-2xl">
                        {totalAfter.toLocaleString('fr-FR')}
                        <span className="text-sm font-normal ml-1">FCFA</span>
                      </span>
                    </div>
                  </div>

                  {/* Bouton Wave */}
                  <a
                    href={buildWaveUrl(totalAfter)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 text-black font-bold text-lg hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <ShoppingBag size={20} />
                    Payer {totalAfter.toLocaleString('fr-FR')} FCFA avec Wave
                  </a>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">
                      Confirmez votre commande au {BRAND_PHONE}
                    </p>
                    <button
                      onClick={clearCart}
                      className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Vider
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Helper à utiliser depuis d'autres composants client pour ajouter un item au panier */
export function addToCart(item: Omit<CartItem, 'qty'> & { qty?: number }) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('cart:add', {
      detail: {
        key: item.key,
        name: item.name,
        parentName: item.parentName,
        price: item.price,
        imagePath: item.imagePath,
        qty: item.qty || 1,
      },
    })
  )
}

/** Helper pour récupérer le nombre total de cartes (utile pour la navbar) */
export function getCartTotalQty(): number {
  if (typeof window === 'undefined') return 0
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return 0
    const parsed: CartState = JSON.parse(saved)
    return Object.values(parsed).reduce((s, it) => s + (it.qty || 0), 0)
  } catch {
    return 0
  }
}
