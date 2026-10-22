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
  Sparkles,
  Home,
} from 'lucide-react'
import { UserMenu } from '@/components/user-menu'

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
  external?: boolean
}

// Tous les liens visibles dans le menu hamburger mobile
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

  // Fermer avec la touche Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {/* Barre mobile (s'affiche en dessous de sm) */}
      <div className="sm:hidden flex items-center gap-2">
        {/* User menu (connexion Google) */}
        <UserMenu />

        {/* Bouton panier */}
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

        {/* Bouton hamburger */}
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors shrink-0"
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
              className="absolute right-0 top-0 h-full w-80 max-w-[88vw] bg-zinc-950 border-l border-zinc-800 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <a href="/" onClick={() => setOpen(false)} className="flex items-center justify-between p-4 border-b border-zinc-800" aria-label="Retour à l'accueil">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center p-1">
                    <img src={brandLogo} alt="" width={20} height={20} />
                  </div>
                  <span className="font-bold tracking-tight">{brandName}</span>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); setOpen(false) }}
                  className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 shrink-0"
                  aria-label="Fermer le menu"
                >
                  <X size={18} />
                </button>
              </a>

              {/* Liens — scrollable si trop long */}
              <nav className="flex-1 overflow-y-auto py-2">
                {/* Navigation principale */}
                <Section label="Navigation">
                  {MAIN_LINKS.map((link) => (
                    <DrawerLink key={link.href} {...link} onClick={() => setOpen(false)} />
                  ))}
                </Section>

                {/* Pages info */}
                <Section label="Informations">
                  {INFO_LINKS.map((link) => (
                    <DrawerLink key={link.href} {...link} onClick={() => setOpen(false)} />
                  ))}
                </Section>

                {/* Compte */}
                <Section label="Mon compte">
                  {ACCOUNT_LINKS.map((link) => (
                    <DrawerLink key={link.href} {...link} onClick={() => setOpen(false)} />
                  ))}
                  {/* Panier avec compteur */}
                  <button
                    onClick={() => {
                      setOpen(false)
                      onOpenCart()
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-white hover:bg-zinc-800 transition-colors font-medium"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-5 h-5 flex items-center justify-center">
                        <ShoppingCart size={18} className="text-emerald-400" />
                      </span>
                      Panier revendeur
                    </span>
                    {cartCount > 0 ? (
                      <span className="min-w-[22px] h-5 px-1.5 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center">
                        {cartCount}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500">Vide</span>
                    )}
                  </button>
                </Section>
              </nav>

              {/* Footer avec bouton appel */}
              <div className="p-4 border-t border-zinc-800 space-y-2">
                <a
                  href={`tel:${brandPhone.replace(/\s/g, '')}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors"
                >
                  <Phone size={18} />
                  Appeler le {brandPhone}
                </a>
                <p className="text-center text-[10px] text-zinc-600">
                  {brandName} — Dakar, Sénégal
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ----- Sous-composants ----- */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function DrawerLink({
  href,
  label,
  icon: Icon,
  onClick,
}: NavLink & { onClick: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-zinc-800 hover:text-emerald-400 transition-colors font-medium"
    >
      <span className="w-5 h-5 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-zinc-400" />
      </span>
      <span>{label}</span>
    </a>
  )
}
