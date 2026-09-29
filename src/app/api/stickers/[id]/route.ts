import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// PUT /api/stickers/[id]
// Met à jour un sticker (label, targetUrl, active).
// Body: { label?, targetUrl?, active? }
// Auth requis.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard

  try {
    const { id } = await params
    const body = await request.json()
    const { label, targetUrl, active, customActionText, customNetwork } = body

    // Vérifier existence
    const existing = await db.getStickerById(id)
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
      customActionText?: string | null
      customNetwork?: 'google' | 'tiktok' | 'instagram' | 'none' | null
    } = {}

    if (label !== undefined) {
      data.label =
        typeof label === 'string' && label.trim() ? label.trim() : null
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

    if (customActionText !== undefined) {
      data.customActionText =
        typeof customActionText === 'string' && customActionText.trim()
          ? customActionText.trim()
          : null
    }

    if (customNetwork !== undefined) {
      const validNetworks = ['google', 'tiktok', 'instagram', 'none']
      data.customNetwork =
        typeof customNetwork === 'string' &&
        validNetworks.includes(customNetwork)
          ? (customNetwork as 'google' | 'tiktok' | 'instagram' | 'none')
          : null
    }

    const updated = await db.updateSticker(id, data)
    if (!updated) {
      return NextResponse.json(
        { error: 'Sticker introuvable' },
        { status: 404 }
      )
    }

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
// Auth requis.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(request)
  if (guard) return guard

  try {
    const { id } = await params

    const existing = await db.getStickerById(id)
    if (!existing) {
      return NextResponse.json(
        { error: 'Sticker introuvable' },
        { status: 404 }
      )
    }

    await db.deleteSticker(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/stickers/[id]]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du sticker' },
      { status: 500 }
    )
  }
}
