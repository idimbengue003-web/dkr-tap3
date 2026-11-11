import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

/**
 * DELETE /api/stickers/all
 *
 * Supprime TOUS les stickers de la base. Utilisé pour repartir de zéro
 * après une phase de test ou avant un nouveau batch.
 *
 * ⚠️ Action irréversible. Supprime aussi les scans et images uploadées.
 * Les commandes ne sont pas affectées.
 *
 * Auth requis.
 */
export async function DELETE(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  try {
    const count = await db.deleteAllStickers()
    return NextResponse.json({
      success: true,
      deleted: count,
      message: `${count} stickers supprimés`,
    })
  } catch (error) {
    console.error('[DELETE /api/stickers/all]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
}
