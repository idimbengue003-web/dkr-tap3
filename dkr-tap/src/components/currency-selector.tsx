'use client'

import { useState, useRef, useEffect } from 'react'
import { useCurrency } from '@/components/currency-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

type Currency = 'FCFA' | 'USD' | 'EUR'

const CURRENCIES: Currency[] = ['FCFA', 'USD', 'EUR']

const SYMBOLS: Record<Currency, string> = {
  FCFA: 'FCFA',
  USD: '$',
  EUR: '€',
}

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
        aria-label="Changer de devise"
      >
        <span>{SYMBOLS[currency]}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute right-0 mt-2 w-32 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden z-50"
          >
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCurrency(c)
                  setOpen(false)
                }}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-zinc-800 transition-colors ${
                  c === currency ? 'text-emerald-400 font-semibold' : 'text-zinc-300'
                }`}
              >
                {c === 'FCFA' ? 'FCFA (Sénégal)' : c === 'USD' ? '$ USD' : '€ EUR'}
              </button>
            ))}
            <div className="px-3 py-2 text-[10px] text-zinc-600 border-t border-zinc-800">
              Taux indicatif. Paiement en FCFA.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
