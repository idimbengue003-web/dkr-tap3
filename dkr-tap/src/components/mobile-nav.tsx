'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Phone } from 'lucide-react'

type Props = {
  brandName: string
  brandLogo: string
  brandPhone: string
  cartCount: number
  onOpenCart: () => void
}

const LINKS = [
  { href: '#modeles', label: 'Modèles' },
  { href: '#tarifs', label: 'Tarifs' },
  { href: '#commander', label: 'Commander' },
]

export function MobileNav({ brandName, brandLogo, brandPhone, cartCount, onOpenCart }: Props) {
  const [open, setOpen] = useState(false)

  // Bloquer le scroll du body quand le menu est ouvert
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

  return (
    <>
      {/* Barre mobile (s'affiche en dessous de sm) */}
      <div className="sm:hidden flex items-center gap-2">
        {/* Bouton panier */}
        <button
          onClick={onOpenCart}
          className="relative w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
          aria-label="Ouvrir le panier"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>

        {/* Bouton hamburger */}
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Drawer menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm sm:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-zinc-950 border-l border-zinc-800 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center p-1">
                    <img src={brandLogo} alt="" width={20} height={20} />
                  </div>
                  <span className="font-bold tracking-tight">{brandName}</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                  aria-label="Fermer le menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Liens */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 rounded-lg text-white hover:bg-zinc-800 transition-colors font-medium"
                  >
                    {link.label}
                  </a>
                ))}

                <button
                  onClick={() => {
                    setOpen(false)
                    onOpenCart()
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-white hover:bg-zinc-800 transition-colors font-medium"
                >
                  <span className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    Panier
                  </span>
                  {cartCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              </nav>

              {/* Footer avec bouton appel */}
              <div className="p-4 border-t border-zinc-800 space-y-2">
                <a
                  href={`tel:${brandPhone.replace(/\s/g, '')}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors"
                >
                  <Phone size={18} />
                  {brandPhone}
                </a>
                <a
                  href="/admin"
                  className="block text-center text-xs text-zinc-600 hover:text-zinc-400 py-1"
                >
                  Espace Gestion
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
