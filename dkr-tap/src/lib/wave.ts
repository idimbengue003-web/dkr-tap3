/**
 * Client Wave Business API (GraphQL) — côté serveur uniquement.
 *
 * Token : variable d'environnement WAVE_API_TOKEN (côté serveur, jamais exposé).
 * Wallet ID : W_sn_LUvGY4hJVmNP (Gaming Store / DKR TAP)
 *
 * Fonctions :
 *   - getWalletBalance() : solde actuel du wallet
 *   - getTransactionHistory(days) : historique des transactions reçues
 *   - checkPaymentReceived(amount, withinMinutes) : vérifie si un paiement d'un montant spécifique a été reçu
 */

const WAVE_API_URL = process.env.WAVE_API_URL || 'https://sn.mmapp.wave.com/a/business_graphql'
const WAVE_API_TOKEN = process.env.WAVE_API_TOKEN || ''
const WALLET_ID = process.env.WAVE_WALLET_ID || 'W_sn_LUvGY4hJVmNP'

type Transaction = {
  id: string
  summary: string
  whenEntered: string
  amount: string
  isPending: boolean
  isCancelled: boolean
}

type WalletBalance = {
  walletOpaqueId: string
  balance: string
  grossVolume: string | null
}

async function waveQuery(query: string, variables: Record<string, unknown> = {}): Promise<Record<string, unknown> | null> {
  if (!WAVE_API_TOKEN) {
    console.warn('[Wave] WAVE_API_TOKEN non configuré')
    return null
  }
  try {
    // Utiliser JSON.stringify pour éviter les problèmes de format
    const body = JSON.stringify({ query, variables })
    const res = await fetch(WAVE_API_URL, {
      method: 'POST',
      headers: {
        'authorization': `Basic ${WAVE_API_TOKEN}`,
        'content-type': 'application/json',
        'origin': 'https://business.wave.com',
        'referer': 'https://business.wave.com/',
      },
      body,
    })
    if (!res.ok) {
      console.error(`[Wave] API ${res.status}`)
      return null
    }
    const json = await res.json()
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
export async function getWalletBalance(): Promise<{ balance: string; grossVolume: string | null } | null> {
  const query = `query WalletHistoryBalancesQuery {
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
  }`
  const data = await waveQuery(query)
  const wallets = (data?.me as any)?.businessUser?.readableWallets as WalletBalance[]
  if (!wallets?.length) return null
  return {
    balance: wallets[0].balance,
    grossVolume: wallets[0].grossVolume,
  }
}

/**
 * Récupère l'historique des transactions sur une période donnée.
 * @param days Nombre de jours d'historique (default: 7)
 * @returns Liste des transactions avec montant, date, summary
 */
export async function getTransactionHistory(days = 7): Promise<Transaction[]> {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)

  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]

  const query = `query HistoryEntries_BusinessWalletHistoryQuery(
    $start: Date!
    $end: Date!
    $walletOpaqueId: String!
    $limit: Int
    $includePending: Boolean
    $transactionType: TransactionType
  ) {
    me {
      businessUser {
        business {
          name
          walletHistory(
            start: $start
            end: $end
            walletOpaqueId: $walletOpaqueId
            limit: $limit
            includePending: $includePending
            transactionType: $transactionType
          ) {
            historyEntries {
              id
              summary
              whenEntered
              amount
              isPending
              isCancelled
            }
          }
        }
      }
    }
  }`

  const data = await waveQuery(query, {
    start: startStr,
    end: endStr,
    walletOpaqueId: WALLET_ID,
    limit: 100,
    includePending: true,
    transactionType: 'ALL',
  })

  const entries = (data?.me as any)?.businessUser?.business?.walletHistory?.historyEntries as Transaction[]
  return entries ?? []
}

/**
 * Vérifie si un paiement d'un montant spécifique a été reçu récemment.
 * 
 * @param expectedAmount Montant attendu en FCFA (ex: 3000)
 * @param withinMinutes Fenêtre de temps en minutes (default: 30)
 * @returns { received: boolean, transaction?: Transaction }
 */
export async function checkPaymentReceived(
  expectedAmount: number,
  withinMinutes = 30
): Promise<{ received: boolean; transaction?: Transaction; checkedAt: string }> {
  const transactions = await getTransactionHistory(1) // 1 jour d'historique

  const now = Date.now()
  const cutoff = now - withinMinutes * 60 * 1000

  for (const tx of transactions) {
    // Ignorer les transactions annulées ou en attente
    if (tx.isCancelled) continue

    // Vérifier que la transaction est dans la fenêtre de temps
    const txTime = new Date(tx.whenEntered).getTime()
    if (txTime < cutoff) continue

    // Extraire le montant numérique depuis le champ "amount" (format: "CFA 3,000" ou "3000")
    const numStr = tx.amount?.replace(/[^0-9]/g, '') || ''
    const txAmount = parseInt(numStr)

    // Vérifier si le montant correspond (à 100 FCFA près pour les frais)
    if (Math.abs(txAmount - expectedAmount) <= 100) {
      return {
        received: true,
        transaction: tx,
        checkedAt: new Date().toISOString(),
      }
    }
  }

  return {
    received: false,
    checkedAt: new Date().toISOString(),
  }
}

/** Vérifie si l'API Wave est configurée */
export function isWaveConfigured(): boolean {
  return !!WAVE_API_TOKEN
}

/** Retourne les infos du merchant (nom, wallet ID) */
export async function getMerchantInfo(): Promise<{ name: string; walletId: string } | null> {
  const query = `query { me { merchant { name id } } }`
  const data = await waveQuery(query)
  const merchant = (data?.me as any)?.merchant
  if (!merchant) return null
  return { name: merchant.name, walletId: WALLET_ID }
}
