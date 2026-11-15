import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// GET /api/site-settings — public
// Retourne les réglages de visibilité des photos sur le site public.
export async function GET() {
  try {
    const settings = await db.getSiteSettings()
    return NextResponse.json(settings, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[GET /api/site-settings]', error)
    return NextResponse.json(
      { photoVisible: { 1: true, 2: true, 3: true, 4: true }, heroImageVisible: true },
      { status: 200 }
    )
  }
}

// PUT /api/site-settings — auth requis
// Met à jour les réglages de visibilité.
// Body: { photoVisible?: { 1: bool, 2: bool, ... }, heroImageVisible?: bool }
export async function PUT(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  let body: {
    photoVisible?: Record<number, boolean>
    heroImageVisible?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  try {
    await db.setSiteSettings({
      photoVisible: body.photoVisible,
      heroImageVisible: body.heroImageVisible,
    })
    const updated = await db.getSiteSettings()
    return NextResponse.json({ ok: true, settings: updated })
  } catch (error) {
    console.error('[PUT /api/site-settings]', error)
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
  }
}
