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

  return (
    <div className="md:hidden flex items-center gap-2">
      {/* Bouton panier */}
      <button
        onClick={onOpenCart}
        className="relative w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 shrink-0"
        aria-label="Panier"
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
        className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 shrink-0"
        aria-label="Menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Menu — rendu UNIQUEMENT quand open (pas de translate caché) */}
      {open && (
        <div className="fixed inset-0 z-[60]" style={{ overflowY: 'auto' }}>
          {/* Overlay noir */}
          <div
            className="fixed inset-0 bg-black/80"
            onClick={() => setOpen(false)}
          />

          {/* Panel blanc qui coulisse */}
          <div
            className="fixed top-0 right-0 h-full w-[85vw] max-w-[360px] bg-zinc-950 border-l border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
              <a href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                <img src={brandLogo} alt="" width={28} height={28} className="rounded-lg" />
                <span className="font-bold text-lg">{brandName}</span>
              </a>
              <button
                onClick={() => setOpen(false)}
                className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 shrink-0"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Liens */}
            <div>
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block px-5 py-4 text-white hover:bg-zinc-800 hover:text-emerald-400 border-b border-zinc-900 font-medium"
                >
                  {link.label}
                </a>
              ))}

              {/* Panier */}
              <button
                onClick={() => { setOpen(false); onOpenCart() }}
                className="w-full text-left px-5 py-4 text-white hover:bg-zinc-800 hover:text-emerald-400 border-b border-zinc-900 font-medium flex items-center justify-between"
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
            </div>

            {/* Bouton appel */}
            <div className="p-4">
              <a
                href={`tel:${brandPhone.replace(/\s/g, '')}`}
                className="block text-center px-4 py-3.5 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
              >
                📞 Appeler le {brandPhone}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
