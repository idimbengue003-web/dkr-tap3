import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

/**
 * POST /api/ai/generate-design — Génère une image de design pour sticker
 *
 * Body: { prompt: string, theme?: 'white'|'black'|'transparent' }
 *
 * Utilise l'IA de génération d'images pour créer un design de sticker
 * basé sur la description de l'admin (ex: "logo salon de coiffure élégant,
 * femme avec tresse, fond pastel").
 *
 * L'image peut ensuite être utilisée comme image de catégorie/modèle
 * ou comme base pour un sticker personnalisé.
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
    } as any)

    // Extraction de l'URL de l'image depuis la réponse
    const imageUrl =
      response?.data?.[0]?.url ||
      response?.data?.[0]?.image_url ||
      response?.images?.[0]?.url ||
      response?.url ||
      null

    if (!imageUrl) {
      console.error('[generate-design] Réponse inattendue:', JSON.stringify(response).slice(0, 500))
      return NextResponse.json(
        { error: 'Aucune image générée dans la réponse de l\'IA' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      imageUrl,
      prompt: userPrompt,
      fullPrompt,
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
