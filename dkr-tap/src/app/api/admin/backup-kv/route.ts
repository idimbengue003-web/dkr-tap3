import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

/**
 * GET /api/admin/backup-kv — exporte toute la KV en JSON (admin only)
 *
 * À utiliser pour télécharger un backup manuel ou automatisé (cron).
 * Le JSON peut être réinjecté en cas de perte de données.
 *
 * ⚠️ Backup lourd — à appeler max 1 fois par jour.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  try {
    const keysToBackup = [
      'stickers:list',
      'stickers:by_created_members',
      'categories:list',
      'orders:list',
      // Pour chaque clé de liste, on récupère les valeurs associées
    ]

    const backup: Record<string, any> = { meta: { createdAt: new Date().toISOString(), version: 1 } }

    for (const listKey of keysToBackup) {
      const ids = (await store.get<string[]>(listKey)) || []
      backup[listKey] = ids
      // Récupérer chaque item
      for (const id of ids) {
        // Pour stickers:list, l'id est déjà le slug
        if (listKey === 'stickers:list') {
          const item = await store.get(`sticker:${id}`)
          if (item) backup[`sticker:${id}`] = item
        }
        // Pour categories:list
        if (listKey === 'categories:list') {
          const item = await store.get(`category:${id}`)
          if (item) backup[`category:${id}`] = item
        }
        // Pour orders:list
        if (listKey === 'orders:list') {
          const item = await store.get(`order:${id}`)
          if (item) backup[`order:${id}`] = item
        }
      }
    }

    // Backup des wallets (clés wallet:<email>) — on doit itérer les profils
    // Comme KV ne supporte pas SCAN, on utilise une clé d'index qu'on maintient
    // Pour l'instant, on backup juste les profils wallet des utilisateurs connus
    // (via les orders.customerName qui contient l'email)
    const orderIds = (await store.get<string[]>('orders:list')) || []
    const seenEmails = new Set<string>()
    for (const oid of orderIds) {
      const order = await store.get<any>(`order:${oid}`)
      if (order?.customerName) seenEmails.add(order.customerName.toLowerCase().trim())
    }
    backup['wallets:emails'] = Array.from(seenEmails)
    for (const email of seenEmails) {
      const wallet = await store.get(`wallet:${email}`)
      if (wallet) backup[`wallet:${email}`] = wallet
      const profile = await store.get(`profile:${email}`)
      if (profile) backup[`profile:${email}`] = profile
      const txIds = (await store.get<string[]>(`wtx:list:${email}`)) || []
      if (txIds.length) backup[`wtx:list:${email}`] = txIds
      for (const txId of txIds) {
        const tx = await store.get(`wtx:${txId}`)
        if (tx) backup[`wtx:${txId}`] = tx
      }
    }

    // Backup des photos de modèles (slots 1-4)
    for (let i = 1; i <= 4; i++) {
      const photo = await store.get<string>(`modelPhoto:${i}`)
      if (photo) backup[`modelPhoto:${i}`] = photo
    }

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="dkr-tap-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/admin/backup-kv]', error)
    return NextResponse.json({ error: 'Erreur lors du backup' }, { status: 500 })
  }
}
