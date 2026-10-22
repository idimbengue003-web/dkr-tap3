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
  /** Email de l'acheteur propriétaire (quand le sticker a été créé suite à une commande).
   *  Permet à l'acheteur de le retrouver dans /account et d'éditer son URL. */
  buyerEmail?: string | null
  /** ID de la commande dont ce sticker est issu (optionnel). */
  orderId?: string | null
  /** Thème visuel du sticker pour l'impression : 'white' (défaut) | 'black' | 'transparent'.
   *  Configurable dans l'admin. */
  stickerTheme?: 'white' | 'black' | 'transparent' | null
  /** Texte d'action personnalisé affiché en haut du sticker.
   *  Si null → utilise le texte par défaut du réseau détecté (ou "Scannez ce QR code"). */
  customActionText?: string | null
  /** Réseau forcé manuellement ('google' | 'tiktok' | 'instagram' | 'none').
   *  Si null ou absent → auto-détecté depuis l'URL cible. */
  customNetwork?: 'google' | 'tiktok' | 'instagram' | 'none' | null
  /** Position du QR code sur l'image uploadée, en pourcentage (0-1).
   *  Coordonnées du CENTRE du QR par rapport aux dimensions de l'image.
   *  Default: { x: 0.85, y: 0.85 } (bas-droite). */
  qrPosition?: { x: number; y: number }
  /** Taille du QR code, en pourcentage (0.1 à 0.5) du min(width, height) de l'image.
   *  Default: 0.25 (25%). */
  qrSize?: number
  /** Texte optionnel superposé à l'image (call-to-action, message, etc.).
   *  Si null → pas de texte. */
  textOverlay?: {
    content: string
    x: number // 0-1, position CENTRE du texte en %
    y: number // 0-1
    size: number // 0.02 à 0.15, taille en % du min(w, h)
  } | null
}

export type StickerInput = {
  slug: string
  label: string | null
  targetUrl: string | null
  active: boolean
  customActionText?: string | null
  customNetwork?: 'google' | 'tiktok' | 'instagram' | 'none' | null
  qrPosition?: { x: number; y: number }
  qrSize?: number
  textOverlay?: {
    content: string
    x: number
    y: number
    size: number
  } | null
}

export type StickerUpdate = Partial<
  Pick<
    Sticker,
    | 'label'
    | 'targetUrl'
    | 'active'
    | 'customActionText'
    | 'customNetwork'
    | 'qrPosition'
    | 'qrSize'
    | 'textOverlay'
  >
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
  async createSticker(input: StickerInput & { buyerEmail?: string | null; orderId?: string | null }): Promise<Sticker> {
    const now = new Date().toISOString()
    const sticker: Omit<Sticker, 'scanCount'> = {
      id: generateId(),
      slug: input.slug,
      label: input.label,
      targetUrl: input.targetUrl,
      active: input.active,
      createdAt: now,
      updatedAt: now,
      buyerEmail: input.buyerEmail ?? null,
      orderId: input.orderId ?? null,
      customActionText: input.customActionText ?? null,
      customNetwork: input.customNetwork ?? null,
      qrPosition: input.qrPosition ?? { x: 0.85, y: 0.85 }, // bas-droite par défaut
      qrSize: input.qrSize ?? 0.25, // 25% du min(w, h) par défaut
      textOverlay: input.textOverlay ?? null,
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
    // Liste simple des slugs pour le lookup par buyerEmail (filtrage in-memory)
    const memberList = (await store.get<string[]>('stickers:by_created_members')) || []
    if (!memberList.includes(input.slug)) {
      memberList.unshift(input.slug)
      await store.set('stickers:by_created_members', memberList)
    }

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
      ...(updates.qrPosition !== undefined
        ? { qrPosition: updates.qrPosition }
        : {}),
      ...(updates.qrSize !== undefined
        ? { qrSize: updates.qrSize }
        : {}),
      ...(updates.textOverlay !== undefined
        ? { textOverlay: updates.textOverlay }
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
      ...(updates.qrPosition !== undefined
        ? { qrPosition: updates.qrPosition }
        : {}),
      ...(updates.qrSize !== undefined
        ? { qrSize: updates.qrSize }
        : {}),
      ...(updates.textOverlay !== undefined
        ? { textOverlay: updates.textOverlay }
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

    // Supprimer sticker, mapping id→slug, compteur de scans, image uploadée
    await store.del(
      `sticker:${slug}`,
      `stickerId:${id}`,
      `scans:${slug}`,
      `stickerImage:${slug}`
    )
    // Retirer le slug de la liste indexée
    const list = (await store.get<string[]>('stickers:list')) || []
    const filtered = list.filter((s) => s !== slug)
    await store.set('stickers:list', filtered)
    return true
  },

  /**
   * Récupère l'image (data URL base64) uploadée pour un sticker.
   * Retourne null si aucune image n'est stockée.
   * Stockée dans une clé séparée `stickerImage:<slug>` pour ne pas
   * faire gonfler l'objet sticker principal (qui reste petit pour le listing).
   */
  async getImage(slug: string): Promise<string | null> {
    return store.get<string>(`stickerImage:${slug}`)
  },

  /**
   * Duplique un sticker : crée un NOUVEAU sticker qui hérite de :
   *   - L'image uploadée (copie de stickerImage:<slug> → stickerImage:<newSlug>)
   *   - La position du QR (qrPosition)
   *   - La taille du QR (qrSize)
   *   - Le texte overlay (textOverlay)
   *   - Le réseau forcé (customNetwork)
   *   - Le texte d'action personnalisé (customActionText)
   *
   * Mais avec :
   *   - Un NOUVEAU slug (auto-généré)
   *   - Un NOUVEAU id
   *   - targetUrl = null (l'utilisateur doit renseigner la nouvelle URL)
   *   - label = "Copie de <original label>" (ou null si l'original n'avait pas de label)
   *   - scanCount = 0
   *
   * Pratique pour créer des stickers à partir d'un "modèle" (template) :
   * l'utilisateur configure un sticker parfait une fois, puis le duplique
   * pour chaque nouveau client en changeant juste l'URL cible.
   */
  async duplicateSticker(id: string): Promise<Sticker | null> {
    const original = await this.getStickerById(id)
    if (!original) return null

    // Générer un nouveau slug unique
    let newSlug = Math.random().toString(36).slice(2, 10)
    let attempts = 0
    while (await this.slugExists(newSlug)) {
      if (attempts++ > 10) {
        newSlug = `${newSlug}-${Math.random().toString(36).slice(2, 6)}`
        break
      }
      newSlug = Math.random().toString(36).slice(2, 10)
    }

    const now = new Date().toISOString()
    const newSticker: Omit<Sticker, 'scanCount'> = {
      id: generateId(),
      slug: newSlug,
      label: original.label ? `Copie de ${original.label}` : null,
      targetUrl: null, // L'utilisateur devra renseigner la nouvelle URL
      active: true,
      createdAt: now,
      updatedAt: now,
      customActionText: original.customActionText ?? null,
      customNetwork: original.customNetwork ?? null,
      qrPosition: original.qrPosition ?? { x: 0.85, y: 0.85 },
      qrSize: original.qrSize ?? 0.25,
      textOverlay: original.textOverlay ?? null,
    }

    // Sauvegarder le nouveau sticker
    await store.set(`sticker:${newSlug}`, newSticker)
    await store.set(`stickerId:${newSticker.id}`, newSlug)

    // Ajouter à la liste indexée
    const list = (await store.get<string[]>('stickers:list')) || []
    list.unshift(newSlug)
    await store.set('stickers:list', list)

    // Copier l'image si elle existe
    const originalImage = await store.get<string>(`stickerImage:${original.slug}`)
    if (originalImage) {
      await store.set(`stickerImage:${newSlug}`, originalImage)
    }

    return { ...newSticker, scanCount: 0 }
  },

  /**
   * Stocke l'image (data URL base64) pour un sticker.
   * @param slug slug du sticker
   * @param dataUrl data URL complète : "data:image/png;base64,..." ou "data:image/jpeg;base64,..."
   */
  async setImage(slug: string, dataUrl: string): Promise<void> {
    await store.set(`stickerImage:${slug}`, dataUrl)
  },

  /**
   * Supprime l'image d'un sticker.
   */
  async deleteImage(slug: string): Promise<void> {
    await store.del(`stickerImage:${slug}`)
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

  /* ============ CATÉGORIES / MODÈLES ============ */

  /**
   * Crée une catégorie de modèle (ex: "Google Reviews", "TikTok", etc.)
   * Chaque catégorie a un prix et peut avoir des modèles/photos associés.
   */
  async createCategory(input: {
    name: string
    network?: string | null
    description?: string | null
    price?: number
    imagePath?: string | null
  }): Promise<Category> {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()
    const cat: Category = {
      id,
      name: input.name,
      network: input.network ?? null,
      description: input.description ?? null,
      price: input.price ?? 3000,
      imagePath: input.imagePath ?? null,
      createdAt: now,
      updatedAt: now,
    }
    await store.set(`category:${id}`, cat)
    const list = (await store.get<string[]>('categories:list')) || []
    list.unshift(id)
    await store.set('categories:list', list)
    return cat
  },

  async listCategories(): Promise<Category[]> {
    const ids = (await store.get<string[]>('categories:list')) || []
    if (!ids.length) {
      // Auto-seed : crée les 8 catégories par défaut au premier appel
      await this.seedDefaultCategories()
      const newIds = (await store.get<string[]>('categories:list')) || []
      if (!newIds.length) return []
      const cats = await store.mget<Category>(...newIds.map((id) => `category:${id}`))
      return cats.filter(Boolean) as Category[]
    }
    const cats = await store.mget<Category>(...ids.map((id) => `category:${id}`))
    return cats.filter(Boolean) as Category[]
  },

  /** Crée les 8 catégories par défaut (Google, TikTok, Instagram, WhatsApp, YouTube, Facebook, Personnalisé, Snapchat) */
  async seedDefaultCategories(): Promise<void> {
    const defaults = [
      { name: 'Google Reviews', network: 'google', price: 3000, description: 'Boostez vos avis Google. Vos clients scannent et laissent une note 5 étoiles en 1 clic.', imagePath: '/network-google.svg' },
      { name: 'TikTok', network: 'tiktok', price: 3000, description: 'Gagnez des abonnés TikTok. Le QR redirige directement vers votre profil ou une vidéo.', imagePath: '/network-tiktok.svg' },
      { name: 'Instagram', network: 'instagram', price: 3000, description: 'Augmentez vos followers Instagram. Le QR mène vers votre compte ou un post spécifique.', imagePath: '/network-instagram.svg' },
      { name: 'WhatsApp', network: 'whatsapp', price: 2500, description: 'Vos clients vous contactent directement sur WhatsApp Business en scannant le sticker.', imagePath: '/network-whatsapp.svg' },
      { name: 'YouTube', network: 'youtube', price: 3500, description: 'Augmentez vos abonnés YouTube. Redirige vers votre chaîne ou une vidéo spécifique.', imagePath: '/network-youtube.svg' },
      { name: 'Facebook', network: 'facebook', price: 2500, description: 'Gagnez des fans Facebook et des recommandations sur votre page professionnelle.', imagePath: '/network-facebook.svg' },
      { name: 'Personnalisé', network: null, price: 5000, description: 'Votre propre design, votre propre URL. Importez votre image et placez le QR où vous voulez.', imagePath: '/dkrtap-logo.png' },
      { name: 'Snapchat', network: 'snapchat', price: 2500, description: 'Ajoutez vos clients sur Snapchat et partagez vos stories.', imagePath: '/network-snapchat.svg' },
    ]
    const list: string[] = []
    for (const d of defaults) {
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
      const now = new Date().toISOString()
      const cat: Category = {
        id, name: d.name, network: d.network, description: d.description,
        price: d.price, imagePath: d.imagePath, createdAt: now, updatedAt: now,
      }
      await store.set(`category:${id}`, cat)
      list.push(id)
    }
    await store.set('categories:list', list)
  },

  async getCategory(id: string): Promise<Category | null> {
    return store.get<Category>(`category:${id}`)
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
    const existing = await store.get<Category>(`category:${id}`)
    if (!existing) return null
    const updated: Category = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await store.set(`category:${id}`, updated)
    return updated
  },

  async deleteCategory(id: string): Promise<boolean> {
    const existing = await store.get<Category>(`category:${id}`)
    if (!existing) return false
    await store.del(`category:${id}`)
    const list = (await store.get<string[]>('categories:list')) || []
    const filtered = list.filter((c) => c !== id)
    await store.set('categories:list', filtered)
    return true
  },

  /* ============ PHOTOS MODÈLES DU SITE ============ */

  async getModelPhoto(slot: number): Promise<string | null> {
    return store.get<string>(`modelPhoto:${slot}`)
  },

  async setModelPhoto(slot: number, dataUrl: string): Promise<void> {
    await store.set(`modelPhoto:${slot}`, dataUrl)
  },

  async getAllModelPhotos(): Promise<(string | null)[]> {
    return Promise.all([1, 2, 3, 4].map((n) => store.get<string>(`modelPhoto:${n}`)))
  },

  /* ============ MODÈLES PAR CATÉGORIE ============ */

  async listModels(categoryId: string): Promise<StickerModel[]> {
    const ids = (await store.get<string[]>(`categoryModels:${categoryId}`)) || []
    if (!ids.length) return []
    const models = await store.mget<StickerModel>(...ids.map((id) => `model:${id}`))
    return models.filter(Boolean) as StickerModel[]
  },

  async createModel(categoryId: string, input: {
    name: string
    description?: string | null
    price?: number
    imagePath?: string | null
    stockStatus?: 'in_stock' | 'on_order' | null
    stockQuantity?: number | null
  }): Promise<StickerModel> {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()
    const model: StickerModel = {
      id, categoryId, name: input.name,
      description: input.description ?? null,
      price: input.price ?? 3000,
      imagePath: input.imagePath ?? null,
      stockStatus: input.stockStatus ?? 'in_stock',
      stockQuantity: input.stockQuantity ?? null,
      createdAt: now, updatedAt: now,
    }
    await store.set(`model:${id}`, model)
    const list = (await store.get<string[]>(`categoryModels:${categoryId}`)) || []
    list.push(id)
    await store.set(`categoryModels:${categoryId}`, list)
    return model
  },

  async updateModel(id: string, updates: Partial<StickerModel>): Promise<StickerModel | null> {
    const existing = await store.get<StickerModel>(`model:${id}`)
    if (!existing) return null
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    await store.set(`model:${id}`, updated)
    return updated
  },

  async deleteModel(id: string): Promise<boolean> {
    const existing = await store.get<StickerModel>(`model:${id}`)
    if (!existing) return false
    await store.del(`model:${id}`)
    const list = (await store.get<string[]>(`categoryModels:${existing.categoryId}`)) || []
    const filtered = list.filter((m) => m !== id)
    await store.set(`categoryModels:${existing.categoryId}`, filtered)
    return true
  },

  /* ============ COMMANDES (VENTES) ============ */

  async createOrder(input: OrderInput): Promise<Order> {
    const id = `ord_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()
    const order: Order = {
      id,
      items: input.items,
      totalQty: input.totalQty,
      totalBefore: input.totalBefore,
      totalAfter: input.totalAfter,
      discountPct: input.discountPct,
      status: 'pending',
      paymentMethod: input.paymentMethod ?? 'wave',
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      customerNote: input.customerNote ?? null,
      type: input.type ?? 'order',
      createdAt: now,
      updatedAt: now,
      paidAt: null,
    }
    await store.set(`order:${id}`, order)
    // Liste simple des IDs, plus récent en premier
    const list = (await store.get<string[]>('orders:list')) || []
    list.unshift(id)
    await store.set('orders:list', list)
    return order
  },

  async listOrders(): Promise<Order[]> {
    const ids = (await store.get<string[]>('orders:list')) || []
    if (!ids.length) return []
    const orders = await store.mget<Order>(...ids.map((id) => `order:${id}`))
    return orders.filter(Boolean) as Order[]
  },

  async getOrder(id: string): Promise<Order | null> {
    return store.get<Order>(`order:${id}`)
  },

  async updateOrderStatus(id: string, status: OrderStatus, extra?: { paidAt?: string }): Promise<Order | null> {
    const existing = await store.get<Order>(`order:${id}`)
    if (!existing) return null
    const now = new Date().toISOString()
    const updated: Order = {
      ...existing,
      status,
      paidAt: status === 'paid' && !existing.paidAt ? (extra?.paidAt ?? now) : existing.paidAt,
      updatedAt: now,
    }
    await store.set(`order:${id}`, updated)
    // Activation des stickers quand la commande passe à "paid"
    // 2 cas possibles :
    // 1. Les stickers ont déjà été créés (par POST /api/orders, en active=false)
    //    → on les active (active=true) pour qu'ils soient scannables
    // 2. Les stickers n'existent pas encore (ancienne commande sans stickers auto)
    //    → on les crée maintenant en active=true
    if (status === 'paid' && existing.status !== 'paid') {
      try {
        const existingStickers = (await store.get<string[]>('stickers:list')) || []
        const alreadyHasStickers = existingStickers.some(
          (slug) => slug.startsWith(`cmd-${id}-`)
        )
        if (alreadyHasStickers) {
          // Cas 1 : les stickers existent (créés en inactive) → les activer
          await this.activateStickersForOrder(id)
        } else {
          // Cas 2 : les stickers n'existent pas → les créer en active=true
          await this.createStickersForOrder(id, true)
        }
      } catch (e) {
        console.error('[updateOrderStatus] Erreur activation stickers pour commande', id, e)
      }
    }
    return updated
  },

  async deleteOrder(id: string): Promise<boolean> {
    const existing = await store.get<Order>(`order:${id}`)
    if (!existing) return false
    await store.del(`order:${id}`)
    const list = (await store.get<string[]>('orders:list')) || []
    const filtered = list.filter((o) => o !== id)
    await store.set('orders:list', filtered)
    return true
  },

  /** Liste les commandes d'achat (type='order') par email d'acheteur.
   *  Les recharges (type='recharge') sont filtrées (affichées séparément dans /account). */
  async listOrdersByEmail(email: string): Promise<Order[]> {
    if (!email) return []
    const target = email.toLowerCase().trim()
    const all = await this.listOrders()
    return all.filter(
      (o) =>
        (o.type || 'order') === 'order' &&
        (o.customerName?.toLowerCase().includes(target) || o.customerPhone === target)
    )
  },

  /** Liste les commandes de recharge (type='recharge') par email — pour l'historique wallet */
  async listRechargeOrdersByEmail(email: string): Promise<Order[]> {
    if (!email) return []
    const target = email.toLowerCase().trim()
    const all = await this.listOrders()
    return all.filter(
      (o) =>
        o.type === 'recharge' &&
        (o.customerName?.toLowerCase().includes(target) || o.customerPhone === target)
    )
  },

  /* ============ WALLET ============ */

  /** Récupère ou crée le wallet d'un utilisateur (par email Google) */
  async getWallet(email: string): Promise<Wallet> {
    const ownerEmail = email.toLowerCase().trim()
    const existing = await store.get<Wallet>(`wallet:${ownerEmail}`)
    if (existing) return existing
    // Créer un wallet vide s'il n'existe pas
    const now = new Date().toISOString()
    const wallet: Wallet = {
      ownerEmail,
      balance: 0,
      createdAt: now,
      updatedAt: now,
    }
    await store.set(`wallet:${ownerEmail}`, wallet)
    return wallet
  },

  /** Ajoute un montant au solde + enregistre la transaction.
   *  amount > 0 pour un dépôt, amount < 0 pour un paiement commande */
  async addWalletTransaction(
    email: string,
    type: 'deposit' | 'order_payment' | 'referral_bonus',
    amount: number,
    orderId?: string | null
  ): Promise<Wallet> {
    const ownerEmail = email.toLowerCase().trim()
    const wallet = await this.getWallet(ownerEmail)
    const updated: Wallet = {
      ...wallet,
      balance: Math.max(0, wallet.balance + amount), // jamais négatif
      updatedAt: new Date().toISOString(),
    }
    await store.set(`wallet:${ownerEmail}`, updated)
    // Enregistrer la transaction
    const txId = `wtx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    const tx: WalletTransaction = {
      id: txId,
      ownerEmail,
      type: type as any,
      amount,
      orderId: orderId ?? null,
      createdAt: new Date().toISOString(),
    }
    await store.set(`wtx:${txId}`, tx)
    // Liste des transactions de l'utilisateur (plus récent en premier)
    const list = (await store.get<string[]>(`wtx:list:${ownerEmail}`)) || []
    list.unshift(txId)
    await store.set(`wtx:list:${ownerEmail}`, list)
    return updated
  },

  /** Programme de parrainage : un nouvel utilisateur est parrainé par un email.
   *  - Enregistre le parrainage (1 seule fois par utilisateur)
   *  - Crédite 1000 FCFA au PARRAIN (sur son wallet) + 500 FCFA au FILLEUL
   *  - Retourne false si le parrainage existe déjà ou si l'email parrain n'a pas de wallet */
  async applyReferral(filleulEmail: string, parrainEmail: string): Promise<boolean> {
    const filleul = filleulEmail.toLowerCase().trim()
    const parrain = parrainEmail.toLowerCase().trim()
    if (!filleul || !parrain || filleul === parrain) return false

    // Vérifier que le parrainage n'existe pas déjà pour ce filleul
    const existingRef = await store.get<string>(`referral:${filleul}`)
    if (existingRef) return false

    // Vérifier que le parrain a un wallet (sinon bonus appliqué quand même, mais trace)
    const parrainWallet = await this.getWallet(parrain)
    const filleulWallet = await this.getWallet(filleul)

    // Créditer le parrain (+1000 FCFA)
    await this.addWalletTransaction(parrain, 'referral_bonus' as any, 1000)
    // Créditer le filleul (+500 FCFA bonus de bienvenue)
    await this.addWalletTransaction(filleul, 'referral_bonus' as any, 500)

    // Enregistrer le parrainage
    await store.set(`referral:${filleul}`, parrain)

    console.log(`[referral] ✓ Parrainage: ${parrain} a parrainé ${filleul} — bonus 1000F + 500F crédités`)
    return true
  },

  /** Vérifie si un utilisateur a déjà été parrainé */
  async getReferral(filleulEmail: string): Promise<string | null> {
    return store.get<string>(`referral:${filleulEmail.toLowerCase().trim()}`)
  },

  /** Liste les transactions wallet d'un utilisateur */
  async listWalletTransactions(email: string): Promise<WalletTransaction[]> {
    const ownerEmail = email.toLowerCase().trim()
    const ids = (await store.get<string[]>(`wtx:list:${ownerEmail}`)) || []
    if (!ids.length) return []
    const txs = await store.mget<WalletTransaction>(...ids.map((id) => `wtx:${id}`))
    return txs.filter(Boolean) as WalletTransaction[]
  },

  /* ============ USER PROFILE (infos de livraison) ============ */

  /** Récupère ou crée le profil d'un utilisateur (par email Google) */
  async getProfile(email: string): Promise<UserProfile> {
    const ownerEmail = email.toLowerCase().trim()
    const existing = await store.get<UserProfile>(`profile:${ownerEmail}`)
    if (existing) return existing
    const now = new Date().toISOString()
    const profile: UserProfile = {
      ownerEmail,
      fullName: null,
      phone: null,
      city: null,
      address: null,
      deliveryNote: null,
      createdAt: now,
      updatedAt: now,
    }
    await store.set(`profile:${ownerEmail}`, profile)
    return profile
  },

  /** Met à jour le profil d'un utilisateur */
  async updateProfile(email: string, updates: Partial<Omit<UserProfile, 'ownerEmail' | 'createdAt' | 'updatedAt'>>): Promise<UserProfile | null> {
    const ownerEmail = email.toLowerCase().trim()
    const existing = await store.get<UserProfile>(`profile:${ownerEmail}`)
    if (!existing) {
      // Créer s'il n'existe pas
      const fresh = await this.getProfile(ownerEmail)
      return this.updateProfile(email, updates)
    }
    const updated: UserProfile = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await store.set(`profile:${ownerEmail}`, updated)
    return updated
  },

  /** Crée les stickers associés à une commande.
   *  Appelée :
   *  - Automatiquement par POST /api/orders avec active=false (cartes visibles
   *    dans /account mais QR pas encore scannable tant que paiement non reçu)
   *  - Automatiquement par updateOrderStatus('paid') si les stickers n'existent
   *    pas encore (sécurité) avec active=true */
  async createStickersForOrder(orderId: string, active: boolean = true): Promise<Sticker[]> {
    const order = await this.getOrder(orderId)
    if (!order) return []
    const buyerEmail = order.customerName || order.customerPhone || null
    const created: Sticker[] = []
    let stickerIdx = 0
    for (const item of order.items) {
      for (let i = 0; i < item.qty; i++) {
        stickerIdx++
        // Slug unique avec préfixe cmd-<orderId>- pour vérifier facilement l'existence
        let slug = `cmd-${orderId}-${stickerIdx}`
        // Si collision (improbable), ajouter un suffixe aléatoire
        if (await this.slugExists(slug)) {
          slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
        }
        const sticker = await this.createSticker({
          slug,
          label: `${item.name} #${i + 1} (cmd ${orderId})`,
          targetUrl: null,
          active, // ⚠️ false tant que la commande n'est pas payée
          buyerEmail,
          orderId,
        })
        created.push(sticker)
      }
    }
    return created
  },

  /** Active tous les stickers d'une commande (quand elle passe en 'paid') */
  async activateStickersForOrder(orderId: string): Promise<number> {
    const all = (await store.get<string[]>('stickers:list')) || []
    const orderSlugPrefix = `cmd-${orderId}-`
    const targetSlugs = all.filter((s) => s.startsWith(orderSlugPrefix))
    for (const slug of targetSlugs) {
      const existing = await store.get<Sticker>(`sticker:${slug}`)
      if (existing && !existing.active) {
        await store.set(`sticker:${slug}`, {
          ...existing,
          active: true,
          updatedAt: new Date().toISOString(),
        })
      }
    }
    return targetSlugs.length
  },

  /** Liste tous les stickers d'un acheteur (par email) */
  async listStickersByBuyerEmail(email: string): Promise<Sticker[]> {
    if (!email) return []
    const target = email.toLowerCase().trim()
    const ids = (await store.get<string[]>('stickers:by_created_members')) || []
    if (!ids.length) return []
    // Pour chaque sticker, vérifier le buyerEmail
    const stickers = await store.mget<Sticker>(...ids.map((id) => `sticker:${id}`))
    return (stickers.filter(Boolean) as Sticker[]).filter(
      (s) => (s.buyerEmail || '').toLowerCase() === target
    )
  },
}

/* ---------------- Types Catégories ---------------- */

export type Category = {
  id: string
  name: string
  network: string | null
  description: string | null
  price: number
  imagePath: string | null
  createdAt: string
  updatedAt: string
}

export type StickerModel = {
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  imagePath: string | null
  /** Statut de stock :
   *  - 'in_stock' : déjà fabriqué, prêt à être livré (livraison immédiate)
   *  - 'on_order' : sur commande, fabriqué après paiement (délai de production)
   *  Default : 'in_stock' (rétro-compatibilité)
   */
  stockStatus?: 'in_stock' | 'on_order' | null
  /** Quantité en stock (uniquement si stockStatus = 'in_stock').
   *  null = illimité (par défaut). Si 0 = rupture de stock. */
  stockQuantity?: number | null
  createdAt: string
  updatedAt: string
}

/* ---------------- Types Commandes ---------------- */

export type OrderStatus = 'pending' | 'paid' | 'printing' | 'shipped' | 'delivered' | 'confirmed' | 'cancelled'

export type OrderItem = {
  /** Clé unique 'cat:<id>' ou 'mod:<id>' */
  key: string
  name: string
  parentName?: string
  /** Prix unitaire de base (avant remise) */
  price: number
  /** Prix unitaire après remise volume */
  unitPrice: number
  qty: number
  imagePath: string | null
}

export type Order = {
  id: string
  items: OrderItem[]
  totalQty: number
  totalBefore: number
  totalAfter: number
  discountPct: number
  status: OrderStatus
  paymentMethod: 'wave' | 'call' | 'other'
  customerName: string | null
  customerPhone: string | null
  customerNote: string | null
  /** Type de commande : 'order' (achat stickers) ou 'recharge' (dépôt sur solde wallet) */
  type?: 'order' | 'recharge'
  createdAt: string
  updatedAt: string
  paidAt: string | null
}

export type OrderInput = {
  items: OrderItem[]
  totalQty: number
  totalBefore: number
  totalAfter: number
  discountPct: number
  paymentMethod?: 'wave' | 'call' | 'other'
  customerName?: string | null
  customerPhone?: string | null
  customerNote?: string | null
  type?: 'order' | 'recharge'
}

/* ---------------- Types Wallet ---------------- */

export type Wallet = {
  ownerEmail: string // clé primaire (email Google de l'utilisateur)
  balance: number // solde en FCFA
  createdAt: string
  updatedAt: string
}

export type WalletTransaction = {
  id: string
  ownerEmail: string
  /** 'deposit' (recharge), 'order_payment' (achat avec solde) ou 'referral_bonus' (parrainage) */
  type: 'deposit' | 'order_payment' | 'referral_bonus'
  /** Montant en FCFA (positif pour deposit/referral, négatif pour order_payment) */
  amount: number
  /** ID de la commande liée (recharge ou order payée) */
  orderId?: string | null
  createdAt: string
}

/* ---------------- Types Profil Utilisateur ---------------- */

export type UserProfile = {
  ownerEmail: string // clé primaire (email Google)
  fullName: string | null
  phone: string | null
  city: string | null
  address: string | null // rue, quartier, numéro...
  deliveryNote: string | null // repère, étage, instructions livraison
  createdAt: string
  updatedAt: string
}
