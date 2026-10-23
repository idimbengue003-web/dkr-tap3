'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  Phone,
  ShoppingCart,
  User,
  Wallet,
  HelpCircle,
  FileText,
  MessageCircle,
  Package,
  Tag,
  Home,
} from 'lucide-react'

type Props = {
  brandName: string
  brandLogo: string
  brandPhone: string
  cartCount: number
  onOpenCart: () => void
}

type NavLink = {
  href: string
  label: string
  icon: typeof Home
}

const MAIN_LINKS: NavLink[] = [
  { href: '/#modeles', label: 'Modèles', icon: Package },
  { href: '/#tarifs', label: 'Tarifs', icon: Tag },
  { href: '/#commander', label: 'Commander', icon: ShoppingCart },
]

const INFO_LINKS: NavLink[] = [
  { href: '/comment-ca-marche', label: 'Comment ça marche', icon: Home },
  { href: '/faq', label: 'FAQ', icon: HelpCircle },
  { href: '/blog', label: 'Blog', icon: FileText },
  { href: '/contact', label: 'Contact', icon: MessageCircle },
]

const ACCOUNT_LINKS: NavLink[] = [
  { href: '/recharger', label: 'Recharger mon solde', icon: Wallet },
  { href: '/account', label: 'Mon compte', icon: User },
]

export function MobileNav({ brandName, brandLogo, brandPhone, cartCount, onOpenCart }: Props) {
  const [open, setOpen] = useState(false)

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {/* Barre mobile */}
      <div className="md:hidden flex items-center gap-1.5">
        <button
          onClick={onOpenCart}
          className="relative w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors shrink-0"
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

        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors shrink-0"
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Drawer — structure simple sans flex-col/flex-1 */}
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Panel — scrollable, pas de flex */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-zinc-950 border-l border-zinc-800 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header — sticky en haut */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                <a
                  href="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5"
                  aria-label="Retour à l'accueil"
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center p-1">
                    <img src={brandLogo} alt="" width={22} height={22} />
                  </div>
                  <span className="font-bold tracking-tight text-lg">{brandName}</span>
                </a>
                <button
                  onClick={() => setOpen(false)}
                  className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 shrink-0"
                  aria-label="Fermer le menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation principale */}
              <div className="px-3 pt-4">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Navigation
                </p>
                <div className="space-y-0.5">
                  {MAIN_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-lg text-white hover:bg-zinc-800 hover:text-emerald-400 transition-colors font-medium"
                    >
                      <link.icon size={18} className="text-zinc-400 shrink-0" />
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Pages info */}
              <div className="px-3 pt-4">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Informations
                </p>
                <div className="space-y-0.5">
                  {INFO_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-lg text-white hover:bg-zinc-800 hover:text-emerald-400 transition-colors font-medium"
                    >
                      <link.icon size={18} className="text-zinc-400 shrink-0" />
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Compte */}
              <div className="px-3 pt-4 pb-2">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Mon compte
                </p>
                <div className="space-y-0.5">
                  {ACCOUNT_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-lg text-white hover:bg-zinc-800 hover:text-emerald-400 transition-colors font-medium"
                    >
                      <link.icon size={18} className="text-zinc-400 shrink-0" />
                      <span>{link.label}</span>
                    </a>
                  ))}
                  {/* Panier */}
                  <button
                    onClick={() => {
                      setOpen(false)
                      onOpenCart()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3.5 rounded-lg text-white hover:bg-zinc-800 hover:text-emerald-400 transition-colors font-medium"
                  >
                    <ShoppingCart size={18} className="text-zinc-400 shrink-0" />
                    <span>Panier revendeur</span>
                    {cartCount > 0 ? (
                      <span className="ml-auto min-w-[22px] h-5 px-1.5 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center">
                        {cartCount}
                      </span>
                    ) : (
                      <span className="ml-auto text-[10px] text-zinc-600">Vide</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Footer — bouton appel */}
              <div className="p-4 border-t border-zinc-800 mt-2">
                <a
                  href={`tel:${brandPhone.replace(/\s/g, '')}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors"
                >
                  <Phone size={18} />
                  Appeler le {brandPhone}
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
