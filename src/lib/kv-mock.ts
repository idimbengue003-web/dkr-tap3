/**
 * Mock Vercel KV — implémentation en mémoire de l'API @vercel/kv.
 *
 * Utilisé automatiquement par `src/lib/db.ts` quand les variables d'env
 * `KV_REST_API_URL` et `KV_REST_API_TOKEN` ne sont pas définies (dev local,
 * sandbox). Sur Vercel, ces variables sont injectées automatiquement à la
 * création d'une KV database, et le vrai client @vercel/kv est utilisé.
 *
 * Implémente uniquement les méthodes utilisées par le projet :
 *   get, set, del, mget, sadd, smembers, srem, zadd, zrange, zrem, incr, exists
 *
 * Limites :
 *   - Pas de persistence entre redémarrages du process (mémoire volatile)
 *   - Pas de transactions atomiques réelles (mais incr est atomique car mono-process)
 *   - Suffit pour le dev local et les tests fonctionnels
 */

type ZSetMember = { score: number; member: string }

export class MockKV {
  private strings = new Map<string, unknown>()
  private sets = new Map<string, Set<string>>()
  private zsets = new Map<string, Map<string, number>>() // member → score
  private lists = new Map<string, unknown[]>() // pour LPUSH/LRANGE/LTRIM

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.strings.has(key)) return null
    // Clone pour éviter les mutations involontaires
    return JSON.parse(JSON.stringify(this.strings.get(key))) as T
  }

  async set(
    key: string,
    value: unknown
  ): Promise<'OK'> {
    this.strings.set(key, JSON.parse(JSON.stringify(value)))
    return 'OK'
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0
    for (const k of keys) {
      if (this.strings.delete(k)) count++
      if (this.sets.delete(k)) count++
      if (this.zsets.delete(k)) count++
    }
    return count
  }

  async mget<T = unknown>(...keys: string[]): Promise<(T | null)[]> {
    return keys.map((k) =>
      this.strings.has(k)
        ? (JSON.parse(JSON.stringify(this.strings.get(k))) as T)
        : null
    )
  }

  async exists(...keys: string[]): Promise<number> {
    let count = 0
    for (const k of keys) {
      if (
        this.strings.has(k) ||
        this.sets.has(k) ||
        this.zsets.has(k)
      )
        count++
    }
    return count
  }

  async sadd(key: string, ...members: (string | number)[]): Promise<number> {
    if (!this.sets.has(key)) this.sets.set(key, new Set())
    const set = this.sets.get(key)!
    let added = 0
    for (const m of members) {
      const s = String(m)
      if (!set.has(s)) {
        set.add(s)
        added++
      }
    }
    return added
  }

  async smembers<T = string>(key: string): Promise<T[]> {
    const set = this.sets.get(key)
    if (!set) return []
    return Array.from(set) as unknown as T[]
  }

  async srem(key: string, ...members: (string | number)[]): Promise<number> {
    const set = this.sets.get(key)
    if (!set) return 0
    let removed = 0
    for (const m of members) {
      if (set.delete(String(m))) removed++
    }
    return removed
  }

  /**
   * Forme supportée : `zadd(key, score, member)` ET `zadd(key, { member: score, ... })`.
   */
  async zadd(
    key: string,
    ...args: [number, string] | [Record<string, number>]
  ): Promise<number> {
    if (!this.zsets.has(key)) this.zsets.set(key, new Map())
    const zset = this.zsets.get(key)!

    if (args.length === 2 && typeof args[0] === 'number' && typeof args[1] === 'string') {
      const [score, member] = args as [number, string]
      const isNew = !zset.has(member)
      zset.set(member, score)
      return isNew ? 1 : 0
    }

    if (args.length === 1 && typeof args[0] === 'object') {
      const mapping = args[0] as Record<string, number>
      let added = 0
      for (const [member, score] of Object.entries(mapping)) {
        const isNew = !zset.has(member)
        zset.set(member, score)
        if (isNew) added++
      }
      return added
    }

    throw new Error('MockKV.zadd: signature non supportée')
  }

  async zrange<T = string>(
    key: string,
    min: number,
    max: number,
    opts?: { rev?: boolean; withScores?: boolean }
  ): Promise<T[]> {
    const zset = this.zsets.get(key)
    if (!zset || zset.size === 0) return []

    // Tri par score croissant par défaut
    const entries: ZSetMember[] = Array.from(zset.entries()).map(
      ([member, score]) => ({ score, member })
    )
    entries.sort((a, b) => a.score - b.score)
    if (opts?.rev) entries.reverse()

    // Gestion des indices négatifs (relatifs à la fin)
    const len = entries.length
    let start = min < 0 ? Math.max(0, len + min) : Math.min(min, len - 1)
    let end = max < 0 ? Math.max(0, len + max) : Math.min(max, len - 1)
    if (start > end || start >= len) return []
    const slice = entries.slice(start, end + 1)

    if (opts?.withScores) {
      return slice.map((e) => ({ member: e.member, score: e.score })) as unknown as T[]
    }
    return slice.map((e) => e.member) as unknown as T[]
  }

  async zrem(key: string, ...members: (string | number)[]): Promise<number> {
    const zset = this.zsets.get(key)
    if (!zset) return 0
    let removed = 0
    for (const m of members) {
      if (zset.delete(String(m))) removed++
    }
    return removed
  }

  async incr(key: string, increment = 1): Promise<number> {
    const v = (typeof this.strings.get(key) === 'number'
      ? (this.strings.get(key) as number)
      : 0) + increment
    this.strings.set(key, v)
    return v
  }

  // === List operations (LPUSH / LRANGE / LTRIM) ===

  async lpush(key: string, ...values: unknown[]): Promise<number> {
    if (!this.lists.has(key)) this.lists.set(key, [])
    const list = this.lists.get(key)!
    // LPUSH insère à gauche (en tête) — dernier élément inséré = premier
    for (const v of values) {
      list.unshift(JSON.parse(JSON.stringify(v)))
    }
    return list.length
  }

  async lrange<T = unknown>(
    key: string,
    start: number,
    stop: number
  ): Promise<T[]> {
    const list = this.lists.get(key)
    if (!list || list.length === 0) return []
    const len = list.length
    // Indices négatifs relatifs à la fin
    let s = start < 0 ? Math.max(0, len + start) : Math.min(start, len - 1)
    let e = stop < 0 ? Math.max(0, len + stop) : Math.min(stop, len - 1)
    if (s > e || s >= len) return []
    return list.slice(s, e + 1) as T[]
  }

  async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
    const list = this.lists.get(key)
    if (!list) return 'OK'
    const len = list.length
    let s = start < 0 ? Math.max(0, len + start) : Math.min(start, len - 1)
    let e = stop < 0 ? Math.max(0, len + stop) : Math.min(stop, len - 1)
    if (s > e || s >= len) {
      this.lists.delete(key)
    } else {
      this.lists.set(key, list.slice(s, e + 1))
    }
    return 'OK'
  }

  /** Reset complet — utile pour les tests. */
  reset(): void {
    this.strings.clear()
    this.sets.clear()
    this.zsets.clear()
    this.lists.clear()
  }
}

// Singleton global pour partager l'état entre les appels au sein d'un même process.
// Utilise globalThis (comme Prisma) pour survivre aux hot reloads HMR de Next.js
// en mode dev — sinon chaque requête obtient un MockKV vide.
declare global {
  var __mockKv: MockKV | undefined
}

export function getMockKv(): MockKV {
  if (!globalThis.__mockKv) globalThis.__mockKv = new MockKV()
  return globalThis.__mockKv
}
