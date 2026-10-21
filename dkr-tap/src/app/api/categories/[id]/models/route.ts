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
  const { name, description, price, imagePath, stockStatus, stockQuantity } = body
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  }
  // Valider stockStatus : 'in_stock' | 'on_order'
  const validStockStatuses = ['in_stock', 'on_order']
  const finalStockStatus =
    typeof stockStatus === 'string' && validStockStatuses.includes(stockStatus)
      ? (stockStatus as 'in_stock' | 'on_order')
      : 'in_stock'
  // Valider stockQuantity : number >= 0 ou null
  let finalStockQuantity: number | null = null
  if (stockQuantity === null) {
    finalStockQuantity = null
  } else if (typeof stockQuantity === 'number' && stockQuantity >= 0) {
    finalStockQuantity = Math.floor(stockQuantity)
  }
  const model = await db.createModel(id, {
    name: name.trim(),
    description: description?.trim() || null,
    price: typeof price === 'number' ? price : undefined,
    imagePath: typeof imagePath === 'string' ? imagePath : null,
    stockStatus: finalStockStatus,
    stockQuantity: finalStockQuantity,
  })
  return NextResponse.json(model, { status: 201 })
}
