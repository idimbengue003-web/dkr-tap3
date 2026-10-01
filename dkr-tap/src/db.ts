import { kv } from '@vercel/kv'
import { getMockKv } from './kv-mock'

/**
 * Détecte si Vercel KV est configuré (env vars injectées par Vercel
 * à la création d'une KV database dans le dashboard).
 *
 * Si oui → on utilise le vrai client @vercel/kv (production sur Vercel).
 * Si non → on utilise le MockKV en mémoire (dev local, sandbox, CI).
 */
const isKVConfigured =
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN

export const store = isKVConfigured ? kv : getMockKv()

// Pour le debug : afficher quel mode est utilisé au premier appel
if (!isKVConfigured && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[KV] Variables KV_REST_API_URL / KV_REST_API_TOKEN manquantes — utilisation du MockKV en mémoire. ' +
      'Les données ne seront PAS persistées entre redémarrages. ' +
      'Sur Vercel, créez une KV database pour activer le vrai stockage.'
  )
}

/* ---------------- Types ---------------- */

export type Sticker = {
  id: string
  slug: string
  label: string | null
  targetUrl: string | null
  scanCount: number
  active: boolean
  createdAt: string // ISO string (sérialisable JSON)
  updatedAt: string
  /** Texte d'action personnalisé affiché en haut du sticker.
   *  Si null → utilise le texte par défaut du réseau détecté (ou "Scannez ce QR code"). */
  customActionText?: string | null
  /** Réseau forcé manuellement ('google' | 'tiktok' | 'instagram' | 'none').
   *  Si null ou absent → auto-détecté depuis l'URL cible. */
  customNetwork?: 'google' | 'tiktok' | 'instagram' | 'none' | null
}

export type StickerInput = {
  slug: string
  label: string | null
  targetUrl: string | null
  active: boolean
  customActionText?: string | null
  customNetwork?: 'google' | 'tiktok' | 'instagram' | 'none' | null
}

export type StickerUpdate = Partial<
  Pick<Sticker, 'label' | 'targetUrl' | 'active' | 'customActionText' | 'customNetwork'>
>

/* ---------------- Helpers ---------------- */

function generateId(): string {
  // Cuid-like : timestamp + random pour éviter les collisions
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Récupère un sticker + son compteur de scans (clé séparée pour incrément
 * atomique) depuis KV.
 */
async function getStickerWithScans(slug: string): Promise<Sticker | null> {
  const [stickerData, scanCount] = await Promise.all([
    store.get<Omit<Sticker, 'scanCount'>>(`sticker:${slug}`),
    store.get<number>(`scans:${slug}`),
  ])
  if (!stickerData) return null
  return {
    ...stickerData,
    scanCount: typeof scanCount === 'number' ? scanCount : 0,
  }
}

/* ---------------- API publique ---------------- */

export const db = {
  /**
   * Crée un sticker. Retourne le sticker créé.
   * Le slug doit être unique — l'appelant doit le vérifier avant.
   */
  async createSticker(input: StickerInput): Promise<Sticker> {
    const now = new Date().toISOString()
    const sticker: Omit<Sticker, 'scanCount'> = {
      id: generateId(),
      slug: input.slug,
      label: input.label,
      targetUrl: input.targetUrl,
      active: input.active,
      createdAt: now,
      updatedAt: now,
      customActionText: input.customActionText ?? null,
      customNetwork: input.customNetwork ?? null,
    }

    // Pipeline-like : set sticker + set id→slug mapping + index liste
    await store.set(`sticker:${input.slug}`, sticker)
    await store.set(`stickerId:${sticker.id}`, input.slug)
    // Index liste des slugs (most recent first) pour lister rapidement.
    // ⚠️ On n'utilise PAS ZADD car @vercel/kv v3 a un bug sur la signature
    // de zadd (TypeError "in operator" ou "wrong number of arguments").
    // Liste JSON simple dans une clé unique — atomique pour notre usage.
    const existingList = (await store.get<string[]>('stickers:list')) || []
    const filtered = existingList.filter((s) => s !== input.slug) // évite les doublons
    filtered.unshift(input.slug) // ajoute en tête (most recent first)
    await store.set('stickers:list', filtered)

    return { ...sticker, scanCount: 0 }
  },

  /**
   * Vérifie si un slug est déjà pris.
   */
  async slugExists(slug: string): Promise<boolean> {
    return (await store.exists(`sticker:${slug}`)) > 0
  },

  /**
   * Récupère un sticker par son slug (cas d'usage : scan QR).
   * Ne déclenche PAS l'incrément du scan count — utiliser incrementScanCount().
   */
  async getStickerBySlug(slug: string): Promise<Sticker | null> {
    return getStickerWithScans(slug)
  },

  /**
   * Récupère un sticker par son id (cas d'usage : PUT/DELETE admin).
   */
  async getStickerById(id: string): Promise<Sticker | null> {
    const slug = await store.get<string>(`stickerId:${id}`)
    if (!slug) return null
    return getStickerWithScans(slug)
  },

  /**
   * Liste tous les stickers triés par createdAt desc.
   */
  async listStickers(): Promise<Sticker[]> {
    // Récupère la liste des slugs (most recent first) — stockée dans une clé unique
    const slugs = (await store.get<string[]>('stickers:list')) || []
    if (!slugs.length) return []

    // Batch fetch : stickers + scan counts en parallèle
    const [stickerDataList, scanCountList] = await Promise.all([
      store.mget<Omit<Sticker, 'scanCount'>>(
        ...slugs.map((s) => `sticker:${s}`)
      ),
      store.mget<number>(...slugs.map((s) => `scans:${s}`)),
    ])

    const result: Sticker[] = []
    for (let i = 0; i < slugs.length; i++) {
      const data = stickerDataList[i]
      if (!data) continue // sticker supprimé mais toujours dans la liste (race)
      result.push({
        ...data,
        scanCount: typeof scanCountList[i] === 'number' ? scanCountList[i]! : 0,
      })
    }
    return result
  },

  /**
   * Met à jour un sticker par son id. Retourne le sticker mis à jour ou null.
   * Le slug n'est pas modifiable (déjà imprimé sur les QR codes physiques).
   */
  async updateSticker(
    id: string,
    updates: StickerUpdate
  ): Promise<Sticker | null> {
    const slug = await store.get<string>(`stickerId:${id}`)
    if (!slug) return null

    const existing = await store.get<Omit<Sticker, 'scanCount'>>(
      `sticker:${slug}`
    )
    if (!existing) return null

    const updated: Omit<Sticker, 'scanCount'> = {
      ...existing,
      ...(updates.label !== undefined ? { label: updates.label } : {}),
      ...(updates.targetUrl !== undefined
        ? { targetUrl: updates.targetUrl }
        : {}),
      ...(updates.active !== undefined ? { active: updates.active } : {}),
      ...(updates.customActionText !== undefined
        ? { customActionText: updates.customActionText }
        : {}),
      ...(updates.customNetwork !== undefined
        ? { customNetwork: updates.customNetwork }
        : {}),
      updatedAt: new Date().toISOString(),
    }

    await store.set(`sticker:${slug}`, updated)
    return getStickerWithScans(slug)
  },

  /**
   * Met à jour un sticker par son slug (pratique pour l'édition par scan QR
   * où on récupère un slug depuis l'URL scannée, pas un id interne).
   * Retourne le sticker mis à jour ou null si introuvable.
   */
  async updateStickerBySlug(
    slug: string,
    updates: StickerUpdate
  ): Promise<Sticker | null> {
    const existing = await store.get<Omit<Sticker, 'scanCount'>>(
      `sticker:${slug}`
    )
    if (!existing) return null

    const updated: Omit<Sticker, 'scanCount'> = {
      ...existing,
      ...(updates.label !== undefined ? { label: updates.label } : {}),
      ...(updates.targetUrl !== undefined
        ? { targetUrl: updates.targetUrl }
        : {}),
      ...(updates.active !== undefined ? { active: updates.active } : {}),
      ...(updates.customActionText !== undefined
        ? { customActionText: updates.customActionText }
        : {}),
      ...(updates.customNetwork !== undefined
        ? { customNetwork: updates.customNetwork }
        : {}),
      updatedAt: new Date().toISOString(),
    }

    await store.set(`sticker:${slug}`, updated)
    return getStickerWithScans(slug)
  },

  /**
   * Supprime un sticker par son id. Retourne true si supprimé.
   */
  async deleteSticker(id: string): Promise<boolean> {
    const slug = await store.get<string>(`stickerId:${id}`)
    if (!slug) return false

    // Supprimer sticker, mapping id→slug, compteur de scans
    await store.del(
      `sticker:${slug}`,
      `stickerId:${id}`,
      `scans:${slug}`
    )
    // Retirer le slug de la liste indexée
    const list = (await store.get<string[]>('stickers:list')) || []
    const filtered = list.filter((s) => s !== slug)
    await store.set('stickers:list', filtered)
    return true
  },

  /**
   * Incrément atomique du compteur de scans (appelé lors du scan QR).
   * Ne fait rien si le sticker n'existe pas.
   */
  async incrementScanCount(slug: string): Promise<void> {
    // Vérifie que le sticker existe pour ne pas polluer KV avec des compteurs orphelins
    const exists = await store.exists(`sticker:${slug}`)
    if (!exists) return
    await store.incr(`scans:${slug}`)
  },

  /**
   * Log un événement de scan (appelé en parallèle de incrementScanCount).
   * Stocké dans une liste Redis `scans:log` (LRANGE pour récupérer, LTRIM
   * pour limiter à 100 entrées récentes — évite l'inflation).
   *
   * L'événement contient : slug, timestamp, et targetUrl optionnel (snapshot
   * au moment du scan — utile pour analytics "à quelle URL pointait ce
   * sticker quand il a été scanné").
   */
  async logScan(
    slug: string,
    meta: { targetUrl: string | null; label: string | null }
  ): Promise<void> {
    const exists = await store.exists(`sticker:${slug}`)
    if (!exists) return

    const event = {
      slug,
      ts: new Date().toISOString(),
      targetUrl: meta.targetUrl,
      label: meta.label,
    }
    // LPUSH insère en tête → les plus récents d'abord
    await store.lpush('scans:log', event)
    // LTRIM à 100 entrées max (de 0 à 99)
    await store.ltrim('scans:log', 0, 99)
  },

  /**
   * Récupère les N derniers scans (logs d'événements).
   */
  async getRecentScans(limit = 10): Promise<
    Array<{
      slug: string
      ts: string
      targetUrl: string | null
      label: string | null
    }>
  > {
    const events = await store.lrange<
      | { slug: string; ts: string; targetUrl: string | null; label: string | null }
      | string
    >('scans:log', 0, Math.max(0, limit - 1))

    // @vercel/kv stocke en JSON, MockKV aussi — on devrait toujours récupérer des objets
    return events.map((e) => {
      if (typeof e === 'string') {
        try {
          return JSON.parse(e)
        } catch {
          return { slug: 'unknown', ts: '', targetUrl: null, label: null }
        }
      }
      return e
    })
  },
}
