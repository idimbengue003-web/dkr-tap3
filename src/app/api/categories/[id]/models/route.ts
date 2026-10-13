import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/categories/[id]/models — liste les modèles d'une catégorie
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const models = await db.listModels(id)
  return NextResponse.json(models)
}

// POST /api/categories/[id]/models — crée un modèle (auth requis)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard
  const { id } = await params
  const body = await request.json()
  const { name, description, price, imagePath } = body
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  }
  const model = await db.createModel(id, {
    name: name.trim(),
    description: description?.trim() || null,
    price: typeof price === 'number' ? price : undefined,
    imagePath: typeof imagePath === 'string' ? imagePath : null,
  })
  return NextResponse.json(model, { status: 201 })
}
