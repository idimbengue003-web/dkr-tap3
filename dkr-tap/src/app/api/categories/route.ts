import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/categories — public (liste toutes les catégories pour la landing page)
export async function GET() {
  try {
    const cats = await db.listCategories()
    return NextResponse.json(cats)
  } catch (error) {
    console.error('[GET /api/categories]', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des catégories' }, { status: 500 })
  }
}

// POST /api/categories — auth requis (admin crée une catégorie)
export async function POST(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard
  try {
    const body = await request.json()
    const { name, network, description, price, imagePath } = body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    }
    const cat = await db.createCategory({
      name: name.trim(),
      network: typeof network === 'string' ? network : null,
      description: typeof description === 'string' ? description : null,
      price: typeof price === 'number' ? price : 3000,
      imagePath: typeof imagePath === 'string' ? imagePath : null,
    })
    return NextResponse.json(cat, { status: 201 })
  } catch (error) {
    console.error('[POST /api/categories]', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}
