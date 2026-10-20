'use client'

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react'

type Currency = 'FCFA' | 'USD' | 'EUR'

type CurrencyContextType = {
  currency: Currency
  setCurrency: (c: Currency) => void
  format: (amountFcfa: number) => string
  rate: number // taux de conversion depuis FCFA
  symbol: string
}

const CurrencyContext = createContext<CurrencyContextType | null>(null)

// Taux de conversion approximatifs (FCFA → autre)
const RATES: Record<Currency, { rate: number; symbol: string; decimals: number }> = {
  FCFA: { rate: 1, symbol: 'FCFA', decimals: 0 },
  USD: { rate: 1 / 600, symbol: '$', decimals: 2 },
  EUR: { rate: 1 / 656, symbol: '€', decimals: 2 },
}

const STORAGE_KEY = 'dkr-tap-currency'

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('FCFA')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'FCFA' || saved === 'USD' || saved === 'EUR') {
        setCurrencyState(saved)
      }
    } catch {}
  }, [])

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c)
    try {
      localStorage.setItem(STORAGE_KEY, c)
    } catch {}
  }, [])

  const format = useCallback((amountFcfa: number) => {
    const { rate, symbol, decimals } = RATES[currency]
    const converted = amountFcfa * rate
    if (currency === 'FCFA') {
      return `${Math.round(converted).toLocaleString('fr-FR')} ${symbol}`
    }
    return `${symbol}${converted.toFixed(decimals)}`
  }, [currency])

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        format,
        rate: RATES[currency].rate,
        symbol: RATES[currency].symbol,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    // Fallback si pas de provider
    return {
      currency: 'FCFA' as Currency,
      setCurrency: () => {},
      format: (n: number) => `${n.toLocaleString('fr-FR')} FCFA`,
      rate: 1,
      symbol: 'FCFA',
    }
  }
  return ctx
}
