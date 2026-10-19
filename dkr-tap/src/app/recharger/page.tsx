'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, ArrowLeft, Loader2, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Plus } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import Link from 'next/link'

type WalletData = {
  balance: number
  ownerEmail: string
  transactions: Array<{
    id: string
    type: 'deposit' | 'order_payment'
    amount: number
    orderId?: string | null
    createdAt: string
  }>
}

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '/scanbridge-logo.svg'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

const PRESET_AMOUNTS = [5000, 10000, 20000, 50000]

function formatFCFA(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function RechargerPage() {
  const { data: session, status } = useSession()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(5000)
  const [customAmount, setCustomAmount] = useState('')
  const [recharging, setRecharging] = useState(false)
  const [rechargeOrderId, setRechargeOrderId] = useState<string | null>(null)
  const [rechargeStatus, setRechargeStatus] = useState<'idle' | 'waiting' | 'paid' | 'error'>('idle')
  const [pollCount, setPollCount] = useState(0)

  const loadWallet = useCallback(async () => {
    if (!session?.user?.email) return
    try {
      const res = await fetch('/api/my/wallet', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setWallet(data)
      }
    } catch (e) {
      console.error('Erreur chargement wallet', e)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (status === 'authenticated') {
      loadWallet()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status, loadWallet])

  // Polling de la recharge
  useEffect(() => {
    if (!rechargeOrderId) return
    if (rechargeStatus === 'paid' || rechargeStatus === 'error') return

    let cancelled = false
    const POLL_INTERVAL = 15_000
    const MAX_POLLS = 120

    const poll = async () => {
      if (cancelled) return
      if (pollCount >= MAX_POLLS) {
        setRechargeStatus('error')
        return
      }
      try {
        const res = await fetch(`/api/orders/${rechargeOrderId}/check-payment`, {
          cache: 'no-store',
        })
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          if (data.paid) {
            setRechargeStatus('paid')
            // Recharger le wallet pour avoir le nouveau solde
            await loadWallet()
            setTimeout(() => {
              setRechargeOrderId(null)
              setRechargeStatus('idle')
              setPollCount(0)
            }, 4000)
            return
          }
        }
      } catch (e) {
        console.warn('[poll] Erreur', e)
      }
      setPollCount((c) => c + 1)
    }

    const initialTimeout = setTimeout(poll, 5000)
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => {
      cancelled = true
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [rechargeOrderId, rechargeStatus, pollCount, loadWallet])

  const handleRecharge = async () => {
    if (recharging) return
    let amount = selectedAmount
    if (selectedAmount === null) {
      const parsed = parseInt(customAmount)
      if (!Number.isFinite(parsed) || parsed < 1000) {
        alert('Montant invalide (minimum 1000 FCFA)')
        return
      }
      amount = parsed
    }
    if (!amount) return

    setRecharging(true)
    try {
      const res = await fetch('/api/wallet/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Échec')
      }
      const data = await res.json()
      setRechargeOrderId(data.orderId)
      setRechargeStatus('waiting')
      setPollCount(0)
      // Ouvrir Wave dans un nouvel onglet
      if (data.waveUrl && data.waveUrl !== '#') {
        window.open(data.waveUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (e) {
      alert('Erreur: ' + (e as Error).message)
    } finally {
      setRecharging(false)
    }
  }

  // Non connecté
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
        <Navbar brandName={BRAND_NAME} brandLogo={BRAND_LOGO_URL} brandPhone={BRAND_PHONE} categories={[]} />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-900 flex items-center justify-center text-emerald-400">
              <Wallet size={28} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Mon solde</h1>
            <p className="text-zinc-400 mb-8">
              Connectez-vous avec Google pour recharger votre solde et payer vos commandes plus rapidement.
            </p>
            <button
              onClick={() => signIn('google')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200"
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
        </main>
      </div>
    )
  }

  // Loading
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
        <Navbar brandName={BRAND_NAME} brandLogo={BRAND_LOGO_URL} brandPhone={BRAND_PHONE} categories={[]} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-zinc-500" />
        </main>
      </div>
    )
  }

  const balance = wallet?.balance || 0

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      <Navbar brandName={BRAND_NAME} brandLogo={BRAND_LOGO_URL} brandPhone={BRAND_PHONE} categories={[]} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-12">
        {/* Back link */}
        <Link
          href="/account"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft size={16} /> Retour à mon compte
        </Link>

        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Wallet size={32} className="text-emerald-400" />
          Mon solde
        </h1>
        <p className="text-zinc-400 mb-8">
          Rechargez votre solde pour payer vos commandes plus rapidement.
          Plus besoin de passer par Wave à chaque achat.
        </p>

        {/* Carte solde */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-900 p-6 mb-8">
          <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wider">Solde actuel</p>
          <p className="text-4xl font-bold text-emerald-400 mb-2">
            {formatFCFA(balance)}
          </p>
          <p className="text-xs text-zinc-500">{session?.user?.email}</p>
        </div>

        {/* Recharge section */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus size={18} className="text-emerald-400" />
            Recharger mon solde
          </h2>

          {/* Quick amounts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  setSelectedAmount(amt)
                  setCustomAmount('')
                }}
                className={`p-3 rounded-lg border text-sm font-semibold transition-colors ${
                  selectedAmount === amt
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-700 hover:border-zinc-600 text-zinc-300'
                }`}
              >
                {formatFCFA(amt)}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="mb-4">
            <label className="text-xs text-zinc-400 mb-1.5 block">Ou montant personnalisé (min 1000 FCFA)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1000"
                step="500"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value)
                  setSelectedAmount(null)
                }}
                placeholder="ex: 7500"
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-sm text-zinc-500">FCFA</span>
            </div>
          </div>

          {/* Recharge button */}
          <button
            onClick={handleRecharge}
            disabled={recharging || rechargeStatus === 'waiting' || (!selectedAmount && !customAmount)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {recharging ? (
              <><Loader2 size={18} className="animate-spin" /> Création en cours…</>
            ) : rechargeStatus === 'paid' ? (
              <><CheckCircle2 size={18} /> Recharge confirmée !</>
            ) : rechargeStatus === 'waiting' ? (
              <>En attente du paiement Wave…</>
            ) : (
              <>
                <Wallet size={18} />
                Recharger {selectedAmount ? formatFCFA(selectedAmount) : customAmount ? formatFCFA(parseInt(customAmount) || 0) : 'un montant'} avec Wave
              </>
            )}
          </button>

          {/* Polling status */}
          <AnimatePresence>
            {rechargeStatus === 'waiting' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm space-y-2"
              >
                <p className="text-yellow-400 font-semibold flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  En attente de votre paiement Wave…
                </p>
                <p className="text-xs text-zinc-400">
                  Vérification automatique toutes les 15s.
                  Le solde sera mis à jour automatiquement après réception du paiement.
                </p>
                {pollCount > 0 && (
                  <p className="text-xs text-zinc-500">Vérif {pollCount}/120</p>
                )}
              </motion.div>
            )}

            {rechargeStatus === 'paid' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm"
              >
                <p className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Recharge confirmée ! 🎉
                </p>
                <p className="text-xs text-zinc-300 mt-1">
                  Votre solde a été mis à jour. Vous pouvez maintenant payer vos commandes instantanément.
                </p>
              </motion.div>
            )}

            {rechargeStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm"
              >
                <p className="text-orange-400 font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  Vérification arrêtée (30 min écoulées)
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Si vous avez payé, appelez le {BRAND_PHONE} pour confirmer.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Historique transactions */}
        {wallet?.transactions && wallet.transactions.length > 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-bold mb-4">Historique des transactions</h2>
            <div className="space-y-2">
              {wallet.transactions.slice(0, 20).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    {tx.amount > 0 ? (
                      <TrendingUp size={16} className="text-emerald-400" />
                    ) : (
                      <TrendingDown size={16} className="text-orange-400" />
                    )}
                    <div>
                      <p className="font-medium">
                        {tx.amount > 0 ? 'Recharge solde' : 'Paiement commande'}
                      </p>
                      <p className="text-xs text-zinc-500">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <span className={tx.amount > 0 ? 'text-emerald-400 font-semibold' : 'text-orange-400 font-semibold'}>
                    {tx.amount > 0 ? '+' : ''}{formatFCFA(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help block */}
        <div className="mt-6 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400">
          <p className="font-semibold text-zinc-300 mb-1">💡 Comment ça marche ?</p>
          <p>
            Vous rechargez votre solde via Wave (5000, 10000, 20000 FCFA ou montant personnalisé).
            Le paiement est détecté automatiquement entre (15-30 secondes).
            Votre solde est ensuite immédiatement disponible pour payer vos commandes sans repasser par Wave.
          </p>
        </div>
      </main>
    </div>
  )
}
