import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// PUT /api/categories/[id] — auth requis
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard
  try {
    const { id } = await params
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (body.network !== undefined) updates.network = body.network
    if (typeof body.description === 'string') updates.description = body.description
    if (typeof body.price === 'number') updates.price = body.price
    if (typeof body.imagePath === 'string') updates.imagePath = body.imagePath
    const updated = await db.updateCategory(id, updates)
    if (!updated) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/categories/[id]]', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

// DELETE /api/categories/[id] — auth requis
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard
  try {
    const { id } = await params
    const ok = await db.deleteCategory(id)
    if (!ok) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/categories/[id]]', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
