'use client'

import { useState, useEffect, useCallback } from 'react'
import { MobileNav } from '@/components/mobile-nav'
import { CartDrawer, getCartTotalQty } from '@/components/cart-drawer'
import { UserMenu } from '@/components/user-menu'

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

// Le panier est mis à jour via un event 'cart:add'. On écoute aussi cet event
// pour rafraîchir le compteur de la navbar en temps réel.
const STORAGE_KEY = 'dkr-tap-cart-v2'

export function Navbar({ brandName, brandLogo, brandPhone, categories }: Props) {
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  // Calculer le nombre total d'items dans le panier (depuis localStorage)
  const refreshCartCount = useCallback(() => {
    setCartCount(getCartTotalQty())
  }, [])

  useEffect(() => {
    refreshCartCount()
    // Re-vérifier quand l'onglet redevient visible, au focus, ou à chaque modif du panier
    const onVisible = () => refreshCartCount()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('storage', onVisible)
    window.addEventListener('cart:add', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('storage', onVisible)
      window.removeEventListener('cart:add', onVisible)
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
            {/* User menu (connexion Google) */}
            <UserMenu />

            {/* Bouton panier desktop */}
            <button
              onClick={openCart}
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
              aria-label="Ouvrir le panier revendeur"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
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

