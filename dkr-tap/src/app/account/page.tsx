'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, QrCode, ExternalLink, LogOut, Save, Check, Loader2, Smartphone, User, MapPin, Phone, Home, FileText, Wallet } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { db } from '@/lib/db' // server side only — won't be used here, using fetch instead

type Order = {
  id: string
  items: any[]
  totalQty: number
  totalBefore: number
  totalAfter: number
  discountPct: number
  status: 'pending' | 'paid' | 'confirmed' | 'cancelled'
  paymentMethod: string
  customerName: string | null
  customerPhone: string | null
  customerNote: string | null
  createdAt: string
  updatedAt: string
  paidAt: string | null
}

type Sticker = {
  id: string
  slug: string
  label: string | null
  targetUrl: string | null
  scanCount: number
  active: boolean
  createdAt: string
  updatedAt: string
  buyerEmail?: string | null
  orderId?: string | null
}

type Profile = {
  ownerEmail: string
  fullName: string | null
  phone: string | null
  city: string | null
  address: string | null
  deliveryNote: string | null
}

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '/scanbridge-logo.svg'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

const STATUS_LABEL = {
  pending: 'En attente',
  paid: 'Payée',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
}

const STATUS_COLOR = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatFCFA(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

export default function AccountPage() {
  const { data: session, status } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  // États pour le formulaire de profil
  const [profileForm, setProfileForm] = useState({
    fullName: '', phone: '', city: '', address: '', deliveryNote: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const loadData = useCallback(async () => {
    if (!session?.user?.email) return
    setLoading(true)
    try {
      const [ordersRes, stickersRes, profileRes] = await Promise.all([
        fetch('/api/my/orders', { cache: 'no-store' }),
        fetch('/api/my/stickers', { cache: 'no-store' }),
        fetch('/api/my/profile', { cache: 'no-store' }),
      ])
      if (ordersRes.ok) setOrders(await ordersRes.json())
      if (stickersRes.ok) setStickers(await stickersRes.json())
      if (profileRes.ok) {
        const p = await profileRes.json()
        setProfile(p)
        setProfileForm({
          fullName: p.fullName || '',
          phone: p.phone || '',
          city: p.city || '',
          address: p.address || '',
          deliveryNote: p.deliveryNote || '',
        })
      }
    } catch (e) {
      console.error('Erreur chargement données', e)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status, loadData])

  const saveProfile = async () => {
    if (savingProfile) return
    setSavingProfile(true)
    try {
      const res = await fetch('/api/my/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      })
      if (!res.ok) throw new Error('Échec sauvegarde')
      const updated = await res.json()
      setProfile(updated)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (e) {
      alert('Erreur: ' + (e as Error).message)
    } finally {
      setSavingProfile(false)
    }
  }

  const saveSticker = async (id: string) => {
    setSavingId(id)
    try {
      const res = await fetch(`/api/my/stickers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: editUrl }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Échec')
      }
      const updated = await res.json()
      setStickers((cur) => cur.map((s) => (s.id === id ? updated : s)))
      setSavedId(id)
      setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2000)
      setEditingStickerId(null)
    } catch (e) {
      alert('Erreur: ' + (e as Error).message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      <Navbar
        brandName={BRAND_NAME}
        brandLogo={BRAND_LOGO_URL}
        brandPhone={BRAND_PHONE}
        categories={[]}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
        {/* Loading */}
        {status === 'loading' && (
          <div className="text-center py-20">
            <Loader2 size={32} className="mx-auto animate-spin text-zinc-500" />
          </div>
        )}

        {/* Pas connecté */}
        {status === 'unauthenticated' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500">
              <Package size={28} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Mon compte</h1>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
              Connectez-vous avec Google pour retrouver vos commandes et configurer le lien de redirection de vos cartes QR.
            </p>
            <button
              onClick={() => signIn('google')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Se connecter avec Google
            </button>
          </div>
        )}

        {/* Connecté */}
        {status === 'authenticated' && session?.user && (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-zinc-800">
              <div className="flex items-center gap-4">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'Avatar'}
                    width={56}
                    height={56}
                    className="rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-black font-bold flex items-center justify-center text-xl">
                    {(session.user.name || session.user.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{session.user.name || 'Mon compte'}</h1>
                  <p className="text-sm text-zinc-500">{session.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700"
              >
                <LogOut size={16} /> Déconnexion
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 size={24} className="mx-auto animate-spin text-zinc-500" />
              </div>
            ) : (
              <>
                {/* Profil de livraison */}
                <section>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <User size={20} className="text-emerald-400" />
                    Profil de livraison
                  </h2>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
                    <p className="text-xs text-zinc-400">
                      Ces informations sont utilisées pour la livraison de vos cartes QR.
                      Elles seront enregistrées pour vos futures commandes.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Nom complet */}
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1">
                          <User size={11} /> Nom complet
                        </label>
                        <input
                          type="text"
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                          placeholder="Ex: Aïssatou Diop"
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Téléphone */}
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1">
                          <Phone size={11} /> Numéro de téléphone
                        </label>
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="Ex: 78 123 45 67"
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Ville */}
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1">
                          <MapPin size={11} /> Ville
                        </label>
                        <input
                          type="text"
                          value={profileForm.city}
                          onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))}
                          placeholder="Ex: Dakar, Pikine, Thies..."
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Quartier/Adresse */}
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1">
                          <Home size={11} /> Adresse (rue, quartier, numéro)
                        </label>
                        <input
                          type="text"
                          value={profileForm.address}
                          onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                          placeholder="Ex: Rue 10, Médina, à côté de la mosquée"
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Note de livraison (textarea) */}
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1">
                        <FileText size={11} /> Instructions de livraison (optionnel)
                      </label>
                      <textarea
                        value={profileForm.deliveryNote}
                        onChange={(e) => setProfileForm((f) => ({ ...f, deliveryNote: e.target.value }))}
                        rows={3}
                        placeholder="Ex: Appeler avant de livrer, demander à un voisin, repère près de l'arrêt de bus..."
                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>

                    {/* Bouton sauvegarder */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      {profileSaved && (
                        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                          <Check size={12} /> Profil enregistré !
                        </p>
                      )}
                      <button
                        onClick={saveProfile}
                        disabled={savingProfile}
                        className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {savingProfile ? (
                          <><Loader2 size={14} className="animate-spin" /> Enregistrement…</>
                        ) : profileSaved ? (
                          <><Check size={14} /> Enregistré</>
                        ) : (
                          <><Save size={14} /> Enregistrer mon profil</>
                        )}
                      </button>
                    </div>

                    {/* Résumé des infos complétées */}
                    {profile && (
                      <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className={profile.fullName ? 'text-emerald-400' : 'text-zinc-600'}>
                          Nom: {profile.fullName ? '✓' : '✗'}
                        </div>
                        <div className={profile.phone ? 'text-emerald-400' : 'text-zinc-600'}>
                          Tél: {profile.phone ? '✓' : '✗'}
                        </div>
                        <div className={profile.city ? 'text-emerald-400' : 'text-zinc-600'}>
                          Ville: {profile.city ? '✓' : '✗'}
                        </div>
                        <div className={profile.address ? 'text-emerald-400' : 'text-zinc-600'}>
                          Adresse: {profile.address ? '✓' : '✗'}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Commandes */}
                <section>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Package size={20} className="text-emerald-400" />
                    Mes commandes
                    {orders.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-zinc-800 text-xs">
                        {orders.length}
                      </span>
                    )}
                  </h2>

                  {orders.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl">
                      <p className="text-zinc-400 mb-2">Aucune commande pour l'instant</p>
                      <p className="text-xs text-zinc-600">
                        Passez une commande via le panier revendeur — elle apparaîtra ici automatiquement.
                      </p>
                      <a
                        href="/#modeles"
                        className="inline-flex items-center gap-1 mt-3 text-sm text-emerald-400 hover:underline"
                      >
                        Voir les modèles →
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((o) => (
                        <div key={o.id} className="rounded-xl border border-zinc-800 p-4 bg-zinc-900/50">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="font-mono text-xs text-zinc-500">{o.id}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLOR[o.status]}`}>
                              {STATUS_LABEL[o.status]}
                            </span>
                            <span className="text-xs text-zinc-400">• {formatDate(o.createdAt)}</span>
                          </div>
                          <div className="flex items-baseline justify-between flex-wrap gap-2">
                            <div>
                              <p className="font-bold text-lg text-emerald-400">{formatFCFA(o.totalAfter)}</p>
                              <p className="text-xs text-zinc-500">
                                {o.totalQty} carte{o.totalQty > 1 ? 's' : ''}
                                {o.discountPct > 0 && <span className="text-emerald-400"> (-{o.discountPct}%)</span>}
                              </p>
                            </div>
                            <div className="text-xs text-zinc-500">
                              {o.items.length} type{o.items.length > 1 ? 's' : ''} de carte
                            </div>
                          </div>
                          {o.status === 'pending' && (
                            <p className="mt-2 text-xs text-yellow-500 flex items-center gap-1.5">
                              <Smartphone size={12} />
                              En attente de paiement — confirmez via Wave au {BRAND_PHONE}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Stickers */}
                <section>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <QrCode size={20} className="text-emerald-400" />
                    Mes cartes QR
                    {stickers.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-zinc-800 text-xs">
                        {stickers.length}
                      </span>
                    )}
                  </h2>

                  {stickers.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl">
                      <p className="text-zinc-400 mb-1">Aucune carte QR pour l'instant</p>
                      <p className="text-xs text-zinc-600">
                        Dès que vous passez une commande, vos cartes QR apparaissent ici.
                        Vous pouvez pré-configurer leur lien de redirection immédiatement —
                        elles seront activées (scannables) dès réception du paiement Wave.
                      </p>
                      <a
                        href="/#modeles"
                        className="inline-flex items-center gap-1 mt-3 text-sm text-emerald-400 hover:underline"
                      >
                        Commander des cartes →
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stickers.map((s) => {
                        const isEditing = editingStickerId === s.id
                        const isSaving = savingId === s.id
                        const isSaved = savedId === s.id
                        // Chercher la commande dont ce sticker est issu
                        const parentOrder = s.orderId ? orders.find((o) => o.id === s.orderId.replace('ord_', '').startsWith(o.id.slice(4)) ? true : false) : null
                        // Plus simple : comparer orderId (qui peut être 'ord_xxx' dans sticker, et order.id est déjà 'ord_xxx')
                        const matchingOrder = s.orderId
                          ? orders.find((o) => o.id === s.orderId || `ord_${o.id}` === s.orderId || o.id === s.orderId.replace('ord_', ''))
                          : null
                        const orderStatus = matchingOrder?.status || null
                        const isPending = orderStatus === 'pending'
                        const isPaid = orderStatus === 'paid' || orderStatus === 'confirmed'
                        return (
                          <div
                            key={s.id}
                            className={`rounded-xl border p-4 bg-zinc-900/50 ${
                              isPending
                                ? 'border-yellow-500/40'
                                : isPaid
                                ? 'border-emerald-500/40'
                                : 'border-zinc-800'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              {/* QR placeholder */}
                              <div className="w-16 h-16 shrink-0 rounded-lg bg-white flex items-center justify-center relative">
                                <QrCode size={32} className={isPending ? 'text-zinc-400' : 'text-black'} />
                                {isPending && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
                                    <span className="text-[8px] font-bold text-zinc-500 rotate-12">PENDING</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
                                  <p className="font-semibold text-sm truncate">{s.label || 'Carte QR'}</p>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {isPending && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 flex items-center gap-1">
                                        <svg className="animate-pulse" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                        En attente de paiement
                                      </span>
                                    )}
                                    {isPaid && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                        Activée
                                      </span>
                                    )}
                                    <span className="text-xs text-zinc-500">
                                      {s.scanCount} scan{s.scanCount > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                                <p className="font-mono text-xs text-zinc-500 mb-2">
                                  /api/r/{s.slug}
                                </p>

                                {isEditing ? (
                                  <div className="space-y-2">
                                    <label className="text-xs text-zinc-400">URL de redirection</label>
                                    <input
                                      type="url"
                                      value={editUrl}
                                      onChange={(e) => setEditUrl(e.target.value)}
                                      placeholder="https://instagram.com/votre-compte"
                                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-emerald-500"
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => saveSticker(s.id)}
                                        disabled={isSaving}
                                        className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 disabled:opacity-60 flex items-center justify-center gap-1.5"
                                      >
                                        {isSaving ? (
                                          <Loader2 size={12} className="animate-spin" />
                                        ) : isSaved ? (
                                          <><Check size={12} /> Enregistré</>
                                        ) : (
                                          <><Save size={12} /> Enregistrer</>
                                        )}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingStickerId(null)
                                          setEditUrl('')
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700"
                                      >
                                        Annuler
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs text-zinc-400 truncate flex-1">
                                      {s.targetUrl ? (
                                        <a
                                          href={s.targetUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                                        >
                                          {s.targetUrl}
                                          <ExternalLink size={10} />
                                        </a>
                                      ) : (
                                        <span className="italic text-zinc-500">Aucune URL configurée</span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setEditingStickerId(s.id)
                                        setEditUrl(s.targetUrl || '')
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-semibold hover:bg-zinc-700"
                                    >
                                      {s.targetUrl ? 'Modifier' : 'Configurer'}
                                    </button>
                                  </div>
                                )}

                                {isSaved && !isEditing && (
                                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                    <Check size={10} /> Lien mis à jour
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
