import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/models/photos/[n] — public (sert l'image binaire)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ n: string }> }
) {
  const { n } = await params
  const slot = parseInt(n)
  if (slot < 1 || slot > 4) {
    return NextResponse.json({ error: 'Slot invalide (1-4)' }, { status: 400 })
  }
  const dataUrl = await db.getModelPhoto(slot)
  if (!dataUrl) {
    return NextResponse.json({ error: 'Aucune photo' }, { status: 404 })
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    return new NextResponse(dataUrl, {
      status: 200,
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
    })
  }
  const [, contentType, base64Data] = match
  const buffer = Buffer.from(base64Data, 'base64')
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300',
    },
  })
}

// POST /api/models/photos/[n] — auth requis (upload image)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ n: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard
  const { n } = await params
  const slot = parseInt(n)
  if (slot < 1 || slot > 4) {
    return NextResponse.json({ error: 'Slot invalide (1-4)' }, { status: 400 })
  }
  let body: { image?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }
  const dataUrl = typeof body.image === 'string' ? body.image.trim() : ''
  if (!dataUrl) {
    return NextResponse.json({ error: 'Image manquante' }, { status: 400 })
  }
  const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/)
  if (!match) {
    return NextResponse.json({ error: 'Format invalide (PNG/JPG/WebP requis)' }, { status: 400 })
  }
  if (match[2].length > 500 * 1024) {
    return NextResponse.json({ error: 'Image trop volumineuse (max 500KB)' }, { status: 400 })
  }
  try {
    await db.setModelPhoto(slot, dataUrl)
    return NextResponse.json({ ok: true, slot })
  } catch (error) {
    console.error('[POST /api/models/photos/[n]]', error)
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
  }
}
