import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

/**
 * POST /api/ai/generate-design — Génère une image de design pour sticker
 *
 * Body: { prompt: string }
 *
 * Utilise l'IA de génération d'images pour créer un design de sticker
 * basé sur la description de l'admin (ex: "logo salon de coiffure élégant,
 * femme avec tresse, fond pastel").
 *
 * Réponse de l'API : tableau d'images en base64 (pas d'URL distante).
 * On convertit en data URL côté serveur pour faciliter l'affichage +
 * le téléchargement côté client.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  try {
    const body = await request.json()
    const userPrompt: string = String(body.prompt || '').trim()
    if (!userPrompt || userPrompt.length < 10) {
      return NextResponse.json({ error: 'Description trop courte (min 10 caractères)' }, { status: 400 })
    }
    if (userPrompt.length > 500) {
      return NextResponse.json({ error: 'Description trop longue (max 500 caractères)' }, { status: 400 })
    }

    // Construction du prompt final — on ajoute du contexte pour l'IA
    const fullPrompt = `Design professionnel pour un sticker QR code de carte de visite (carré, 10x10 cm) : ${userPrompt}. Style moderne, propre, minimaliste, couleurs vives, adapté pour impression haute qualité. Pas de texte superflu. Format carré.`

    // Appel à l'API de génération d'images via z-ai-web-dev-sdk
    const { default: ZAI } = await import('z-ai-web-dev-sdk')
    const zai = await ZAI.create()

    const response = await zai.images.generations.create({
      prompt: fullPrompt,
      size: '1024x1024', // carré pour sticker
    })

    // ⚠️ L'API renvoie du base64 dans data[].base64 (PAS d'URL distante)
    // On convertit en data URL pour faciliter l'affichage + le téléchargement
    const base64 = response?.data?.[0]?.base64
    if (!base64) {
      console.error('[generate-design] Réponse inattendue (pas de base64):', JSON.stringify(response).slice(0, 800))
      return NextResponse.json(
        {
          error: 'L\'IA n\'a pas pu générer d\'image. Réessaie avec une description différente.',
          responseStructure: JSON.stringify(response).slice(0, 500),
        },
        { status: 500 }
      )
    }

    // Construire le data URL complet (format PNG)
    const dataUrl = `data:image/png;base64,${base64}`

    return NextResponse.json({
      imageUrl: dataUrl,
      prompt: userPrompt,
      fullPrompt,
      // Infos pour le client
      isDataUrl: true,
    })
  } catch (error: any) {
    console.error('[POST /api/ai/generate-design]', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la génération de l\'image',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}
