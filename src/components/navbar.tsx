'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Phone, ShoppingBag, Sparkles } from 'lucide-react'
import { MobileNav } from '@/components/mobile-nav'
import { CartDrawer } from '@/components/cart-drawer'

type Category = {
  id: string
  name: string
  network: string | null
  description: string | null
  price: number
  imagePath: string | null
}

type Props = {
  brandName: string
  brandLogo: string
  brandPhone: string
  categories: Category[]
}

const LINKS = [
  { href: '#modeles', label: 'Modèles' },
  { href: '#tarifs', label: 'Tarifs' },
  { href: '#commander', label: 'Commander' },
]

const STORAGE_KEY = 'dkr-tap-cart-v1'

export function Navbar({ brandName, brandLogo, brandPhone, categories }: Props) {
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  // Calculer le nombre total d'items dans le panier (depuis localStorage)
  const refreshCartCount = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          const total = Object.values(parsed).reduce((s: number, v: any) => s + (Number(v) || 0), 0)
          setCartCount(total)
          return
        }
      }
    } catch {}
    setCartCount(0)
  }, [])

  useEffect(() => {
    refreshCartCount()
    // Re-vérifier quand l'onglet redevient visible ou au focus
    const onVisible = () => refreshCartCount()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('storage', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('storage', onVisible)
    }
  }, [refreshCartCount])

  // Re-vérifier quand on ferme le panier (les quantités ont pu changer)
  useEffect(() => {
    if (!cartOpen) {
      const t = setTimeout(refreshCartCount, 50)
      return () => clearTimeout(t)
    }
  }, [cartOpen, refreshCartCount])

  const openCart = () => setCartOpen(true)

  return (
    <>
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center p-1.5">
              <img src={brandLogo} alt={`Logo ${brandName}`} width={28} height={28} />
            </div>
            <span className="text-xl font-bold tracking-tight">{brandName}</span>
          </div>

          {/* Nav desktop */}
          <nav className="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
            ))}
          </nav>

          {/* Boutons desktop */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Bouton panier desktop */}
            <button
              onClick={openCart}
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
              aria-label="Ouvrir le panier revendeur"
            >
              <ShoppingBag size={16} className="text-emerald-400" />
              <span className="hidden lg:inline">Panier revendeur</span>
              {cartCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Bouton tel desktop */}
            <a
              href={`tel:${brandPhone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-colors"
            >
              <Phone size={16} />
              {brandPhone}
            </a>
          </div>

          {/* Boutons mobile : panier + hamburger */}
          <div className="sm:hidden">
            <MobileNav
              brandName={brandName}
              brandLogo={brandLogo}
              brandPhone={brandPhone}
              cartCount={cartCount}
              onOpenCart={openCart}
            />
          </div>
        </div>
      </header>

      {/* Drawer panier — partagé mobile + desktop */}
      <CartDrawer categories={categories} open={cartOpen} onOpenChange={setCartOpen} />
    </>
  )
}
