'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, User, ChevronDown, Package, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'

export function UserMenu() {
  const { data: session, status } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // État de chargement
  if (status === 'loading') {
    return (
      <div className="w-9 h-9 rounded-lg bg-zinc-800 animate-pulse" />
    )
  }

  // Non connecté → bouton "Se connecter"
  if (!session) {
    return (
      <button
        onClick={() => signIn('google')}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold transition-colors"
        title="Se connecter avec Google"
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        <span className="hidden sm:inline">Connexion</span>
      </button>
    )
  }

  // Connecté → avatar + menu déroulant
  const user = session.user
  const isAdmin = (user as any).isAdmin

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
        title={user.email || 'Mon compte'}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name || 'Avatar'}
            width={28}
            height={28}
            className="rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-black font-bold flex items-center justify-center text-xs">
            {(user.name || user.email || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <ChevronDown size={14} className="text-zinc-400 hidden sm:block" />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute right-0 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-3 border-b border-zinc-800">
              <p className="text-sm font-semibold text-white truncate">{user.name || 'Utilisateur'}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>

            {/* Liens */}
            <div className="py-1">
              <Link
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                <Package size={14} /> Mes commandes
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-zinc-800"
                >
                  <ExternalLink size={14} /> Espace gestion
                </Link>
              )}
            </div>

            {/* Déconnexion */}
            <div className="border-t border-zinc-800 py-1">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  signOut()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                <LogOut size={14} /> Déconnexion
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
