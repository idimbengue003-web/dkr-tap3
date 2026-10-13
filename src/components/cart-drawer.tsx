'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, ShoppingBag, Trash2, Sparkles } from 'lucide-react'

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

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'
const WAVE_BASE_URL = process.env.NEXT_PUBLIC_WAVE_PAYMENT_URL || '#'

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

const STORAGE_KEY = 'dkr-tap-cart-v1'

// Preset Pack Revendeur : 5 Instagram, 2 Snapchat, 3 Facebook, 2 YouTube
const PACK_REVENDEUR: Record<string, number> = {}

type CartState = Record<string, number> // categoryId -> qty

export function CartDrawer({ categories, open, onOpenChange }: Props) {
  const [cart, setCart] = useState<CartState>({})

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

  // Identifier les catégories par nom (pour le preset Pack Revendeur)
  const findCatIdByName = useCallback(
    (name: string) => categories.find((c) => c.name.toLowerCase().includes(name.toLowerCase()))?.id,
    [categories]
  )

  // Calcul du total quantité + total prix
  const { totalQty, items, totalBefore, totalAfter, discountPct } = useMemo(() => {
    let totalQty = 0
    let totalBefore = 0
    let totalAfter = 0

    const items = categories
      .filter((c) => (cart[c.id] || 0) > 0)
      .map((c) => {
        const qty = cart[c.id] || 0
        totalQty += qty
        return {
          ...c,
          qty,
          unitPrice: c.price, // sera recalculé après avoir totalQty
        }
      })

    // 2e passe : appliquer la remise sur chaque ligne
    items.forEach((it) => {
      it.unitPrice = getUnitPrice(it.price, totalQty)
      totalBefore += it.price * it.qty
      totalAfter += it.unitPrice * it.qty
    })

    const discountPct = getDiscountPct(totalQty)
    return { totalQty, items, totalBefore, totalAfter, discountPct }
  }, [cart, categories])

  const setQty = (catId: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev }
      if (qty <= 0) {
        delete next[catId]
      } else {
        next[catId] = Math.min(99, qty)
      }
      return next
    })
  }

  const inc = (catId: string) => setQty(catId, (cart[catId] || 0) + 1)
  const dec = (catId: string) => setQty(catId, (cart[catId] || 0) - 1)

  const applyPackRevendeur = () => {
    const next: CartState = {}
    const igId = findCatIdByName('Instagram')
    const snapId = findCatIdByName('Snap')
    const fbId = findCatIdByName('Facebook')
    const ytId = findCatIdByName('YouTube')

    if (igId) next[igId] = 5
    if (snapId) next[snapId] = 2
    if (fbId) next[fbId] = 3
    if (ytId) next[ytId] = 2

    // Si aucune catégorie n'a matché par nom, on prend les 4 premières au hasard
    if (Object.keys(next).length === 0 && categories.length >= 4) {
      next[categories[0].id] = 5
      next[categories[1].id] = 2
      next[categories[2].id] = 3
      next[categories[3].id] = 2
    }

    setCart(next)
  }

  const clearCart = () => {
    if (confirm('Vider le panier ?')) setCart({})
  }

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

            {/* Liste des catégories avec sélecteurs de quantité */}
            <div className="flex-1 overflow-y-auto p-4">
              {categories.length === 0 ? (
                <p className="text-center text-zinc-500 py-12">
                  Aucune catégorie disponible pour l'instant.
                </p>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => {
                    const qty = cart[cat.id] || 0
                    const isActive = qty > 0
                    return (
                      <div
                        key={cat.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          isActive ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800'
                        }`}
                      >
                        {/* Image / icône */}
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {cat.imagePath ? (
                            <img src={cat.imagePath} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">📦</span>
                          )}
                        </div>

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{cat.name}</p>
                          <p className="text-xs text-zinc-500">
                            {cat.price.toLocaleString('fr-FR')} FCFA / carte
                          </p>
                        </div>

                        {/* Sélecteur quantité */}
                        <div className="flex items-center gap-2 shrink-0">
                          {qty > 0 ? (
                            <>
                              <button
                                onClick={() => dec(cat.id)}
                                className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                                aria-label="Retirer"
                              >
                                {qty === 1 ? <Trash2 size={14} className="text-red-400" /> : <Minus size={14} />}
                              </button>
                              <span className="text-lg font-bold w-8 text-center">{qty}</span>
                              <button
                                onClick={() => inc(cat.id)}
                                className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                                aria-label="Ajouter"
                              >
                                <Plus size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => inc(cat.id)}
                              className="px-3 h-8 rounded-lg bg-zinc-800 flex items-center gap-1 text-xs font-semibold hover:bg-zinc-700"
                            >
                              <Plus size={14} /> Ajouter
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer : résumé + paiement */}
            <div className="border-t border-zinc-800 p-4 space-y-3">
              {totalQty === 0 ? (
                <p className="text-center text-zinc-500 text-sm py-2">
                  Sélectionnez vos catégories pour activer la remise volume.
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
