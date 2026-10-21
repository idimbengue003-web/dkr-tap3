'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, ShoppingBag, ShoppingCart, Check } from 'lucide-react'
import { addToCart } from '@/components/cart-drawer'

type Category = {
  id: string
  name: string
  network: string | null
  description: string | null
  price: number
  imagePath: string | null
}

type Model = {
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  imagePath: string | null
  stockStatus?: 'in_stock' | 'on_order' | null
  stockQuantity?: number | null
}

// Badge de stock affiché sur chaque carte d'annonce
function StockBadge({ model }: { model: Model }) {
  const status = model.stockStatus ?? 'in_stock'
  if (status === 'on_order') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
        🛠️ Sur commande
      </span>
    )
  }
  // in_stock
  if (model.stockQuantity == null) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
        📦 En stock
      </span>
    )
  }
  if (model.stockQuantity === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-semibold">
        ❌ Rupture
      </span>
    )
  }
  if (model.stockQuantity <= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/30 text-[10px] font-semibold">
        ⚠️ Plus que {model.stockQuantity}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
      📦 En stock ({model.stockQuantity})
    </span>
  )
}

// Retourne la couleur d'accent hex d'une catégorie (basé sur son network ou défaut emerald)
function getCatAccent(cat: Category): string {
  const colorMap: Record<string, string> = {
    google: '#4285F4',
    tiktok: '#FE2C55',
    instagram: '#d6299f',
    whatsapp: '#25D366',
    youtube: '#FF0000',
    facebook: '#1877F2',
    snapchat: '#FFFC00',
  }
  if (cat.network && colorMap[cat.network]) return colorMap[cat.network]
  return '#10b981' // emerald par défaut
}

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const WAVE_BASE_URL = process.env.NEXT_PUBLIC_WAVE_PAYMENT_URL || '#'

// Construit le lien Wave avec le montant exact à payer
// Format Wave : https://pay.wave.com/m/.../c/sn/?amount=XXXX
function buildWaveUrl(amount: number): string {
  if (WAVE_BASE_URL === '#') return '#'
  // Retirer le slash final si présent, puis ajouter ?amount=
  const base = WAVE_BASE_URL.replace(/\/$/, '')
  return `${base}?amount=${amount}`
}

// Prix dégressifs par quantité
function getUnitPrice(basePrice: number, qty: number): number {
  if (qty >= 20) return Math.round(basePrice * 0.5) // 50% du prix
  if (qty >= 10) return Math.round(basePrice * 0.83) // ~2500 si base 3000
  return basePrice
}

export function CategoryShop({ categories }: { categories: Category[] }) {
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [orderModal, setOrderModal] = useState<{ name: string; price: number; image: string | null } | null>(null)
  const [qty, setQty] = useState(1)
  const [addedModelId, setAddedModelId] = useState<string | null>(null)

  const openCategory = async (cat: Category) => {
    setSelectedCat(cat)
    setModels([])
    setLoadingModels(true)
    try {
      const res = await fetch(`/api/categories/${cat.id}/models`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setModels(data)
      }
    } catch {}
    setLoadingModels(false)
  }

  const openOrderModal = (name: string, price: number, image: string | null) => {
    setOrderModal({ name, price, image })
    setQty(1)
  }

  const unitPrice = orderModal ? getUnitPrice(orderModal.price, qty) : 0
  const totalPrice = unitPrice * qty

  return (
    <>
      {/* Grille des catégories — design pro inspiré e-commerce */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => openCategory(cat)}
            className="group relative flex flex-col items-center text-center bg-white rounded-2xl border border-zinc-200 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all cursor-pointer overflow-hidden hover:-translate-y-1 duration-200"
          >
            {/* Header avec logo centré sur fond dégradé subtil */}
            <div
              className="w-full h-28 flex items-center justify-center relative overflow-hidden"
              style={{
                background: `radial-gradient(circle at center, ${getCatAccent(cat)}15 0%, transparent 70%)`,
              }}
            >
              {cat.imagePath ? (
                <img
                  src={cat.imagePath}
                  alt={cat.name}
                  width={64}
                  height={64}
                  className="object-contain transition-transform group-hover:scale-110 duration-300"
                />
              ) : (
                <span className="text-3xl">📦</span>
              )}
            </div>

            {/* Body centré */}
            <div className="px-4 py-4 flex-1 flex flex-col items-center w-full">
              <h3 className="font-bold text-zinc-900 text-base mb-1">{cat.name}</h3>

              {/* Prix mis en évidence */}
              <p className="text-emerald-600 font-bold text-lg mb-2">
                {cat.price.toLocaleString('fr-FR')}
                <span className="text-xs text-zinc-500 font-normal ml-1">FCFA</span>
              </p>

              {/* Description courte */}
              {cat.description && (
                <p className="text-xs text-zinc-500 leading-relaxed mb-3 line-clamp-2 flex-1">
                  {cat.description}
                </p>
              )}

              {/* Bouton "Voir les modèles" style pro */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openCategory(cat)
                }}
                className="mt-auto w-full py-2 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5 group/btn"
              >
                Voir les modèles
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover/btn:translate-x-0.5">
                  <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal catégorie → liste des modèles */}
      <AnimatePresence>
        {selectedCat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedCat(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  {selectedCat.imagePath && <img src={selectedCat.imagePath} alt="" width={32} height={32} />}
                  <div>
                    <h3 className="font-bold text-lg">{selectedCat.name}</h3>
                    <p className="text-xs text-zinc-400">À partir de {selectedCat.price.toLocaleString('fr-FR')} FCFA / carte</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCat(null)} className="text-zinc-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              {/* Modèles */}
              <div className="p-4">
                {loadingModels ? (
                  <p className="text-center text-zinc-400 py-8">Chargement des modèles...</p>
                ) : models.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-zinc-400 mb-4">Aucun modèle disponible pour l'instant.</p>
                    {/* Bouton commander la catégorie directement */}
                    <button
                      onClick={() => {
                        openOrderModal(selectedCat.name, selectedCat.price, selectedCat.imagePath)
                        setSelectedCat(null)
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400"
                    >
                      <ShoppingBag size={16} /> Commander cette catégorie
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {models.map((m) => {
                      const isAdded = addedModelId === m.id
                      return (
                      <div key={m.id} className="rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-600 transition-colors">
                        {m.imagePath && (
                          <div className="aspect-square bg-zinc-800">
                            <img src={m.imagePath} alt={m.name} className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{m.name}</h4>
                            <StockBadge model={m} />
                          </div>
                          {m.description && <p className="text-xs text-zinc-400 mb-2">{m.description}</p>}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-emerald-400 font-bold">{m.price.toLocaleString('fr-FR')} FCFA</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  addToCart({
                                    key: `mod:${m.id}`,
                                    name: m.name,
                                    parentName: selectedCat.name,
                                    price: m.price,
                                    imagePath: m.imagePath,
                                  })
                                  setAddedModelId(m.id)
                                  setTimeout(() => setAddedModelId((cur) => (cur === m.id ? null : cur)), 1500)
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                                  isAdded
                                    ? 'bg-emerald-500 text-black'
                                    : 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700'
                                }`}
                                aria-label="Ajouter au panier"
                              >
                                {isAdded ? <><Check size={12} /> Ajouté</> : <><ShoppingCart size={12} /> Panier</>}
                              </button>
                              <button
                                onClick={() => {
                                  openOrderModal(m.name, m.price, m.imagePath)
                                  setSelectedCat(null)
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400"
                              >
                                Commander
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal commande → quantité + prix dégressif + Wave */}
      <AnimatePresence>
        {orderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOrderModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-zinc-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {orderModal.image && <img src={orderModal.image} alt="" width={40} height={40} />}
                  <h3 className="font-bold">{orderModal.name}</h3>
                </div>
                <button onClick={() => setOrderModal(null)} className="text-zinc-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Quantité */}
                <div>
                  <label className="text-sm text-zinc-400 mb-3 block">Quantité</label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="text-2xl font-bold w-12 text-center">{qty}</span>
                    <button
                      onClick={() => setQty(Math.min(100, qty + 1))}
                      className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Prix dégressif */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Prix unitaire</span>
                    <span className="text-white font-semibold">{unitPrice.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  {qty >= 10 && (
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>🎁 Remise volume appliquée</span>
                      <span>-{Math.round((1 - unitPrice / orderModal.price) * 100)}%</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg border-t border-zinc-800 pt-3">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-emerald-400 font-bold text-xl">{totalPrice.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>

                {/* Tableau des paliers */}
                <div className="text-xs text-zinc-500 space-y-1">
                  <p className="font-semibold text-zinc-400 mb-1">Tarifs dégressifs :</p>
                  <div className="flex justify-between"><span>1 à 9 cartes</span><span>{orderModal.price.toLocaleString('fr-FR')} FCFA/carte</span></div>
                  <div className="flex justify-between"><span>10 à 19 cartes</span><span>{Math.round(orderModal.price * 0.83).toLocaleString('fr-FR')} FCFA/carte</span></div>
                  <div className="flex justify-between"><span>20 cartes et +</span><span>{Math.round(orderModal.price * 0.5).toLocaleString('fr-FR')} FCFA/carte</span></div>
                </div>

                {/* Bouton Wave — montant exact dynamique */}
                <a
                  href={buildWaveUrl(totalPrice)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-black font-bold text-lg hover:bg-emerald-400 transition-colors"
                >
                  <ShoppingBag size={20} />
                  Payer {totalPrice.toLocaleString('fr-FR')} FCFA avec Wave
                </a>

                <p className="text-xs text-zinc-500 text-center">
                  Après le paiement, appelez le {process.env.NEXT_PUBLIC_BRAND_PHONE} pour confirmer votre commande.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
