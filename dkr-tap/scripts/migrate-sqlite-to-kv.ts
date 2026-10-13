#!/usr/bin/env bun
/**
 * Migration SQLite (ancienne version Prisma) → Vercel KV
 *
 * Usage :
 *   bun run scripts/migrate-sqlite-to-kv.ts [chemin/vers/custom.db]
 *
 * Lit tous les stickers de l'ancienne base SQLite (via bun:sqlite) et les
 * écrit directement dans Vercel KV en utilisant @vercel/kv (contourne l'API
 * HTTP pour des raisons de simplicité et de rapidité).
 *
 * Pré-requis :
 *   - Avoir créé une KV database sur Vercel et connecté au projet
 *   - En local : `vercel env pull .env.local` pour récupérer KV_REST_API_URL et KV_REST_API_TOKEN
 *
 * Le script échoue proprement si :
 *   - KV n'est pas configuré (variables d'env manquantes)
 *   - Le fichier SQLite n'existe pas
 *   - Aucun sticker à migrer
 */

import { Database } from 'bun:sqlite'
import { kv } from '@vercel/kv'

const dbPath = process.argv[2] || './db/custom.db'

interface StickerRow {
  id: string
  slug: string
  label: string | null
  targetUrl: string | null
  scanCount: number
  active: number // SQLite retourne 0/1 pour les booléens
  createdAt: string
  updatedAt: string
}

// 1. Vérifier que KV est configuré
console.log('🔍 Vérification de la configuration Vercel KV...')
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  console.error('')
  console.error('❌ Variables KV_REST_API_URL et KV_REST_API_TOKEN requises.')
  console.error('')
  console.error('   Sur Vercel : créez une KV database dans le dashboard,')
  console.error('                connectez-la au projet — les variables seront')
  console.error('                auto-injectées.')
  console.error('')
  console.error('   En local :')
  console.error('     1) Créez la KV database sur Vercel (dashboard)')
  console.error('     2) vercel link  (si pas déjà fait)')
  console.error('     3) vercel env pull .env.local')
  console.error('     4) Relancez ce script')
  console.error('')
  process.exit(1)
}
console.log(`   ✓ KV configuré : ${process.env.KV_REST_API_URL}`)
console.log('')

// 2. Ouvrir la base SQLite
console.log(`📦 Lecture SQLite : ${dbPath}`)
let sqliteDb: Database
try {
  const file = Bun.file(dbPath)
  if (!(await file.exists())) {
    console.error(`❌ Fichier SQLite introuvable : ${dbPath}`)
    console.error('')
    console.error('   Si vous n\'avez pas d\'ancienne base SQLite à migrer,')
    console.error('   ignorez ce script. La nouvelle base KV est vide et')
    console.error('   vous pouvez créer vos stickers via l\'interface admin.')
    console.error('')
    process.exit(1)
  }
  sqliteDb = new Database(dbPath, { readonly: true })
} catch (e) {
  console.error(`❌ Impossible d'ouvrir ${dbPath} : ${e instanceof Error ? e.message : e}`)
  process.exit(1)
}

// 3. Lister les stickers
let rows: StickerRow[]
try {
  // Vérifier que la table Sticker existe
  const tables = sqliteDb.query("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
  if (!tables.some((t) => t.name === 'Sticker')) {
    console.error('❌ La table "Sticker" n\'existe pas dans la base SQLite.')
    console.error('   Tables trouvées :', tables.map((t) => t.name).join(', '))
    sqliteDb.close()
    process.exit(1)
  }

  rows = sqliteDb
    .query(
      'SELECT id, slug, label, targetUrl, scanCount, active, createdAt, updatedAt FROM Sticker'
    )
    .all() as StickerRow[]
} catch (e) {
  console.error(`❌ Erreur lecture SQLite : ${e instanceof Error ? e.message : e}`)
  sqliteDb.close()
  process.exit(1)
}

console.log(`   ✓ ${rows.length} stickers trouvés dans SQLite`)
console.log('')

if (rows.length === 0) {
  console.log('Rien à migrer. Au revoir 👋')
  sqliteDb.close()
  process.exit(0)
}

// 4. Vérifier les collisions (slug déjà en KV)
console.log('🔍 Vérification des collisions de slug...')
const existingSlugs: string[] = []
for (const row of rows) {
  if ((await kv.exists(`sticker:${row.slug}`))) {
    existingSlugs.push(row.slug)
  }
}
if (existingSlugs.length > 0) {
  console.error(`   ⚠️  ${existingSlugs.length} slugs existent déjà en KV :`)
  existingSlugs.slice(0, 5).forEach((s) => console.error(`      - ${s}`))
  if (existingSlugs.length > 5) console.error(`      ... et ${existingSlugs.length - 5} autres`)
  console.error('')
  console.error('   Options :')
  console.error('   1) Supprimer ces stickers de KV avant de relancer le script')
  console.error('   2) Modifier leurs slugs dans la base SQLite avant migration')
  console.error('   3) Forcer la migration (--force) — les stickers existants seront')
  console.error('      écrasés avec les données SQLite (perte des modifications récentes)')
  console.error('')
  if (!process.argv.includes('--force')) {
    sqliteDb.close()
    process.exit(1)
  }
  console.log('   → --force détecté, on continue en écrasant...')
}
console.log('')

// 5. Migrer chaque sticker
console.log('🚀 Migration en cours...')
let migrated = 0
let failed = 0

for (const row of rows) {
  try {
    const createdAtMs = new Date(row.createdAt).getTime() || Date.now()

    // Pipeline-like : on écrit les 4 clés en une fois pour rester cohérent
    // (sticker, stickerId, zset by_created, scans)
    await kv.set(`sticker:${row.slug}`, {
      id: row.id,
      slug: row.slug,
      label: row.label,
      targetUrl: row.targetUrl,
      active: Boolean(row.active),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
    await kv.set(`stickerId:${row.id}`, row.slug)
    await kv.zadd('stickers:by_created', createdAtMs, row.slug)
    if (row.scanCount > 0) {
      await kv.set(`scans:${row.slug}`, row.scanCount)
    }

    migrated++
    console.log(
      `   ✓ ${row.slug}  (label="${row.label || ''}", url=${row.targetUrl || '(vide)'}, scans=${row.scanCount})`
    )
  } catch (e) {
    failed++
    console.error(`   ✗ ${row.slug} : ${e instanceof Error ? e.message : e}`)
  }
}

sqliteDb.close()

// 6. Résumé
console.log('')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`🎉 Migration terminée : ${migrated}/${rows.length} stickers migrés`)
if (failed > 0) {
  console.log(`⚠️  ${failed} échec(s) — voir les erreurs ci-dessus`)
  process.exit(1)
}
console.log('')
console.log('✓ Vous pouvez maintenant déployer sur Vercel et tous les stickers')
console.log('  seront accessibles immédiatement.')
console.log('')
console.log('Prochaine étape :')
console.log('  1) Push le code sur GitHub')
console.log('  2) Vercel → Importer le repo (KV vars auto-injectées)')
console.log('  3) Vos stickers sont déjà dans KV — prêts à scanner !')
process.exit(0)
