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
    const { label, targetUrl, active, customActionText, customNetwork, qrPosition, qrSize, textOverlay } = body

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
      qrPosition?: { x: number; y: number }
      qrSize?: number
      textOverlay?: {
        content: string
        x: number
        y: number
        size: number
      } | null
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

    if (qrPosition !== undefined) {
      // Valider qrPosition : objet { x, y } avec x,y ∈ [0, 1]
      if (
        qrPosition &&
        typeof qrPosition === 'object' &&
        typeof qrPosition.x === 'number' &&
        typeof qrPosition.y === 'number' &&
        qrPosition.x >= 0 && qrPosition.x <= 1 &&
        qrPosition.y >= 0 && qrPosition.y <= 1
      ) {
        data.qrPosition = { x: qrPosition.x, y: qrPosition.y }
      } else if (qrPosition === null) {
        data.qrPosition = { x: 0.85, y: 0.85 } // reset au défaut
      }
    }

    // Valider qrSize : nombre entre 0.1 et 0.5
    if (qrSize !== undefined) {
      if (qrSize === null) {
        data.qrSize = 0.25 // reset au défaut
      } else if (
        typeof qrSize === 'number' &&
        qrSize >= 0.1 &&
        qrSize <= 0.5
      ) {
        data.qrSize = qrSize
      }
    }

    // Valider textOverlay : objet { content, x, y, size }
    if (textOverlay !== undefined) {
      if (textOverlay === null) {
        data.textOverlay = null // désactive le texte
      } else if (
        textOverlay &&
        typeof textOverlay === 'object' &&
        typeof textOverlay.content === 'string' &&
        textOverlay.content.trim() &&
        typeof textOverlay.x === 'number' &&
        typeof textOverlay.y === 'number' &&
        typeof textOverlay.size === 'number' &&
        textOverlay.x >= 0 && textOverlay.x <= 1 &&
        textOverlay.y >= 0 && textOverlay.y <= 1 &&
        textOverlay.size >= 0.02 && textOverlay.size <= 0.15
      ) {
        data.textOverlay = {
          content: textOverlay.content.trim().slice(0, 200), // max 200 chars
          x: textOverlay.x,
          y: textOverlay.y,
          size: textOverlay.size,
        }
      }
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
