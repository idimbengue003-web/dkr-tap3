import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/stickers/[id]
// Met à jour un sticker (label, targetUrl, active).
// Body: { label?, targetUrl?, active? }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { label, targetUrl, active } = body

    // Vérifier existence
    const existing = await db.sticker.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Sticker introuvable' },
        { status: 404 }
      )
    }

    // Construire l'objet de mise à jour (uniquement les champs fournis)
    const data: {
      label?: string | null
      targetUrl?: string | null
      active?: boolean
    } = {}

    if (label !== undefined) {
      data.label = typeof label === 'string' && label.trim() ? label.trim() : null
    }

    if (targetUrl !== undefined) {
      if (typeof targetUrl === 'string' && targetUrl.trim()) {
        try {
          data.targetUrl = new URL(targetUrl.trim()).toString()
        } catch {
          return NextResponse.json(
            { error: 'URL cible invalide' },
            { status: 400 }
          )
        }
      } else {
        data.targetUrl = null // Permet de "vider" l'URL (sticker redevient vierge)
      }
    }

    if (active !== undefined) {
      data.active = Boolean(active)
    }

    const updated = await db.sticker.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/stickers/[id]]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du sticker' },
      { status: 500 }
    )
  }
}

// DELETE /api/stickers/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.sticker.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Sticker introuvable' },
        { status: 404 }
      )
    }

    await db.sticker.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/stickers/[id]]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du sticker' },
      { status: 500 }
    )
  }
}
