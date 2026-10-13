'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, ShoppingBag } from 'lucide-react'

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
      {/* Grille des catégories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="group rounded-2xl border border-zinc-800 hover:border-emerald-500 transition-all overflow-hidden bg-zinc-900/50 cursor-pointer"
            onClick={() => openCategory(cat)}
          >
            <div className="h-24 flex items-center justify-center" style={{ background: `radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)` }}>
              {cat.imagePath ? (
                <img src={cat.imagePath} alt={cat.name} width={48} height={48} />
              ) : (
                <span className="text-2xl">📦</span>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-bold text-base mb-1">{cat.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold">{cat.price.toLocaleString('fr-FR')} FCFA</span>
                <span className="text-xs text-emerald-400 group-hover:underline">Voir les modèles →</span>
              </div>
              {cat.description && <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{cat.description}</p>}
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
                    {models.map((m) => (
                      <div key={m.id} className="rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-600 transition-colors">
                        {m.imagePath && (
                          <div className="aspect-video bg-zinc-800">
                            <img src={m.imagePath} alt={m.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-3">
                          <h4 className="font-semibold text-sm mb-1">{m.name}</h4>
                          {m.description && <p className="text-xs text-zinc-400 mb-2">{m.description}</p>}
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-bold">{m.price.toLocaleString('fr-FR')} FCFA</span>
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
                    ))}
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
