'use client'

import { useState } from 'react'

type Props = {
  brandName: string
  brandLogo: string
  brandPhone: string
  cartCount: number
  onOpenCart: () => void
}

const LINKS = [
  { href: '/#modeles', label: 'Modèles' },
  { href: '/#tarifs', label: 'Tarifs' },
  { href: '/#commander', label: 'Commander' },
  { href: '/comment-ca-marche', label: 'Comment ça marche' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
  { href: '/recharger', label: 'Recharger mon solde' },
  { href: '/account', label: 'Mon compte' },
  { href: '/contact', label: 'Contact' },
]

export function MobileNav({ brandName, brandLogo, brandPhone, cartCount, onOpenCart }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className="md:hidden flex items-center gap-2">
        <button
          onClick={onOpenCart}
          className="relative w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
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
          className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white shrink-0"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    )
  }

  // Quand open = true : un seul <div> fixed qui contient overlay + panel
  return (
    <>
      {/* Barre mobile (boutons) — toujours visible */}
      <div className="md:hidden flex items-center gap-2">
        <button
          onClick={onOpenCart}
          className="relative w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white shrink-0"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Menu — UN SEUL div fixed, overlay + panel en absolute DEDANS */}
      <div
        className="fixed inset-0 z-[60] md:hidden"
        onClick={() => setOpen(false)}
      >
        {/* Overlay — absolute dans le parent fixed */}
        <div className="absolute inset-0 bg-black" style={{ opacity: 0.85 }} />

        {/* Panel — absolute dans le parent fixed, à droite */}
        <div
          className="absolute top-0 right-0 h-screen w-[85vw] max-w-[360px] bg-zinc-950 border-l border-zinc-800 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <a href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
              <img src={brandLogo} alt="" width={28} height={28} className="rounded-lg" />
              <span className="font-bold text-lg text-white">{brandName}</span>
            </a>
            <button
              onClick={() => setOpen(false)}
              className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Liens — simple liste, pas de container complexe */}
          <a href="/#modeles" onClick={() => setOpen(false)} className="block px-5 py-4 text-white border-b border-zinc-900">Modèles</a>
          <a href="/#tarifs" onClick={() => setOpen(false)} className="block px-5 py-4 text-white border-b border-zinc-900">Tarifs</a>
          <a href="/#commander" onClick={() => setOpen(false)} className="block px-5 py-4 text-white border-b border-zinc-900">Commander</a>
          <a href="/comment-ca-marche" onClick={() => setOpen(false)} className="block px-5 py-4 text-white border-b border-zinc-900">Comment ça marche</a>
          <a href="/faq" onClick={() => setOpen(false)} className="block px-5 py-4 text-white border-b border-zinc-900">FAQ</a>
          <a href="/blog" onClick={() => setOpen(false)} className="block px-5 py-4 text-white border-b border-zinc-900">Blog</a>
          <a href="/recharger" onClick={() => setOpen(false)} className="block px-5 py-4 text-white border-b border-zinc-900">Recharger mon solde</a>
          <a href="/account" onClick={() => setOpen(false)} className="block px-5 py-4 text-white border-b border-zinc-900">Mon compte</a>
          <a href="/contact" onClick={() => setOpen(false)} className="block px-5 py-4 text-white border-b border-zinc-900">Contact</a>

          {/* Panier */}
          <button
            onClick={() => { setOpen(false); onOpenCart() }}
            className="w-full text-left px-5 py-4 text-white border-b border-zinc-900 flex items-center justify-between"
          >
            <span>Panier revendeur</span>
            {cartCount > 0 ? (
              <span className="min-w-[22px] h-5 px-1.5 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center">
                {cartCount}
              </span>
            ) : (
              <span className="text-xs text-zinc-600">Vide</span>
            )}
          </button>

          {/* Bouton appel */}
          <div className="p-4">
            <a
              href={`tel:${brandPhone.replace(/\s/g, '')}`}
              className="block text-center px-4 py-3.5 rounded-xl bg-emerald-500 text-black font-semibold"
            >
              📞 Appeler le {brandPhone}
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
