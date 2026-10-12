import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// PUT /api/models/[id] — modifie un modèle (auth requis)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard
  const { id } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string') updates.name = body.name.trim()
  if (typeof body.description === 'string') updates.description = body.description
  if (typeof body.price === 'number') updates.price = body.price
  if (typeof body.imagePath === 'string') updates.imagePath = body.imagePath
  const updated = await db.updateModel(id, updates)
  if (!updated) return NextResponse.json({ error: 'Modèle introuvable' }, { status: 404 })
  return NextResponse.json(updated)
}

// DELETE /api/models/[id] — supprime un modèle (auth requis)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard
  const { id } = await params
  const ok = await db.deleteModel(id)
  if (!ok) return NextResponse.json({ error: 'Modèle introuvable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
