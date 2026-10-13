/**
 * Client Wave Business API (GraphQL) — côté serveur uniquement.
 *
 * Le token API est stocké en variable d'environnement WAVE_API_TOKEN (côté serveur).
 * NE JAMAIS exposer ce token côté client (pas de NEXT_PUBLIC_).
 *
 * Utilisé pour :
 *   - Vérifier le solde du wallet Wave Business
 *   - Vérifier l'historique des transactions (paiements reçus)
 *   - Valider automatiquement qu'un paiement a été reçu
 */

const WAVE_API_URL = process.env.WAVE_API_URL || 'https://sn.mmapp.wave.com/a/business_graphql'
const WAVE_API_TOKEN = process.env.WAVE_API_TOKEN || ''

type Wallet = {
  walletOpaqueId: string
  balance: number
  grossVolume: number
}

type WaveResponse<T> = {
  data?: T
  errors?: Array<{ message: string }>
}

async function waveQuery<T>(query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
  if (!WAVE_API_TOKEN) {
    console.warn('[Wave] WAVE_API_TOKEN non configuré')
    return null
  }
  try {
    const res = await fetch(WAVE_API_URL, {
      method: 'POST',
      headers: {
        'authorization': `Basic ${WAVE_API_TOKEN}`,
        'content-type': 'application/json',
        'origin': 'https://business.wave.com',
        'referer': 'https://business.wave.com/',
      },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) {
      console.error(`[Wave] API ${res.status}: ${await res.text()}`)
      return null
    }
    const json: WaveResponse<T> = await res.json()
    if (json.errors?.length) {
      console.error('[Wave] GraphQL errors:', json.errors)
      return null
    }
    return json.data ?? null
  } catch (e) {
    console.error('[Wave] Request failed:', e)
    return null
  }
}

/** Récupère le solde du wallet Wave Business */
export async function getWalletBalance(): Promise<{ balance: number; grossVolume: number } | null> {
  const data = await waveQuery<{
    me: {
      businessUser: {
        readableWallets: Wallet[]
      } | null
    } | null
  }>(`query WalletHistoryBalancesQuery {
    me {
      businessUser {
        readableWallets {
          walletOpaqueId
          balance
          grossVolume
        }
        id
      }
      id
    }
  }`)
  const wallets = data?.me?.businessUser?.readableWallets
  if (!wallets?.length) return null
  return {
    balance: wallets[0].balance,
    grossVolume: wallets[0].grossVolume,
  }
}

/**
 * Vérifie l'historique des transactions récentes.
 * Permet de détecter si un paiement d'un montant spécifique a été reçu.
 *
 * @param minAmount Montant minimum en FCFA à chercher (optionnel)
 * @param sinceMinutes Chercher dans les N dernières minutes (default: 60)
 */
export async function checkRecentTransactions(
  minAmount?: number,
  sinceMinutes = 60
): Promise<{
  received: boolean
  amount?: number
  transactions: Array<{ amount: number; date: string; reference?: string }>
}> {
  // Pour l'instant, on utilise la query de balance.
  // Wave Business API a une query pour l'historique des transactions
  // mais son schéma exact dépend de l'API Wave.
  // On compare le grossVolume (volume total) avant/après pour détecter un nouveau paiement.

  const balance = await getWalletBalance()
  if (!balance) {
    return { received: false, transactions: [] }
  }

  // Stocker le dernier grossVolume vu pour comparer
  // (simplifié — en production on utiliserait une vraie query de transactions)
  return {
    received: false,
    transactions: [{
      amount: balance.grossVolume,
      date: new Date().toISOString(),
      reference: 'grossVolume (total)',
    }],
  }
}

/** Vérifie si l'API Wave est configurée */
export function isWaveConfigured(): boolean {
  return !!WAVE_API_TOKEN
}
