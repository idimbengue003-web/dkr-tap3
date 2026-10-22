import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { callZaiImage, ZaiUnavailableError } from '@/lib/zai-api'

/**
 * POST /api/ai/generate-design — Génère une image de design pour sticker QR
 *
 * Body: { prompt: string, businessType?: string, network?: string }
 *
 * L'IA génère des designs PROFESSIONNELS spécifiques aux stickers DKR TAP :
 * - Cartes carrées 10×10 cm avec emplacement QR réservé
 * - Style adapté au type de business (salon, resto, boutique...)
 * - Couleurs cohérentes avec la marque réseau si fourni
 * - Qualité impression pro (300 DPI équivalent)
 *
 * Prompts rejetés si non pertinents (alcool, tabac, contenu explicite, etc.)
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

    // Validation : rejeter les prompts non pertinents pour le business DKR TAP
    const forbiddenKeywords = [
      'alcool', 'alcohol', 'whisky', 'vodka', 'bière', 'beer', 'wine', 'vin',
      'cigarette', 'tabac', 'tobacco', 'cigar',
      'weapon', 'gun', 'arme', 'pistolet',
      'nude', 'naked', 'nsfw', 'sex', 'adult',
      'violence', 'blood', 'gore',
    ]
    const lowerPrompt = userPrompt.toLowerCase()
    const foundForbidden = forbiddenKeywords.find((k) => lowerPrompt.includes(k))
    if (foundForbidden) {
      return NextResponse.json(
        {
          error: `Type de design non supporté (${foundForbidden}). DKR TAP génère uniquement des designs professionnels pour business légitimes : salons, restaurants, boutiques, services, etc.`,
        },
        { status: 400 }
      )
    }

    // Paramètres optionnels pour mieux orienter l'IA
    const businessType: string = String(body.businessType || '').trim()
    const network: string = String(body.network || '').trim()

    // Construction du prompt final — très spécifique aux stickers DKR TAP
    // pour forcer l'IA à générer des designs professionnels et adaptés
    const businessContext = businessType
      ? `Contexte business : ${businessType}.`
      : 'Contexte business : commerce dakartois.'

    const networkContext = network
      ? `Réseau cible : ${network} (la carte sera scannée pour rediriger vers ce réseau).`
      : 'Réseau cible : générique (compatible tous réseaux).'

    const fullPrompt = `PROFESSIONAL QR CODE STICKER CARD DESIGN — square format 10×10 cm

${businessContext}
${networkContext}
User request: ${userPrompt}

DESIGN REQUIREMENTS (strict, professional quality):
1. SQUARE FORMAT — composition centered, balanced for 10×10cm print
2. CLEAN SPACE in the bottom-right quadrant (reserved for QR code 4×4cm)
   → DO NOT draw a QR code, just leave clear space for it
3. MINIMALIST STYLE — modern, elegant, suitable for premium business card
4. HIGH CONTRAST areas so the QR (added later) stays scannable
5. CORPORATE-QUALITY visual identity:
   - Cohesive color palette (2-3 colors max)
   - Clean typography if text is included (sans-serif, modern)
   - Recognizable logo/icon centered or top
   - Suitable for Senegalese business context (Dakar, modern Africa)
6. NO TEXT like "scan me" or "scan here" — the QR will be added separately
7. NO actual QR code in the image (just visual design, QR added later)
8. QUALITY: professional print-ready, crisp edges, modern aesthetic
9. SUITABLE FOR: business cards, retail displays, restaurant tables, salon mirrors

Reference visual style: clean modern brand stickers like Notion, Linear,
Stripe branded cards. African-inspired but minimalist. High-end feel.

Generate a single square image, 1024×1024, ready to be used as background
for a QR code sticker.`

    // Appel à l'API ZAI directement (bypass du SDK qui a besoin d'un fichier
    // .z-ai-config absent sur Vercel serverless)
    const response = await callZaiImage(fullPrompt, '1024x1024')

    // ⚠️ L'API peut retourner soit du base64, soit des URLs (déjà téléchargées par callZaiImage)
    const base64 = response?.data?.[0]?.base64
    if (!base64) {
      console.error('[generate-design] Réponse inattendue (pas de base64):', JSON.stringify(response).slice(0, 800))
      return NextResponse.json(
        {
          error: 'L\'IA n\'a pas pu générer d\'image. Réessaie avec une description différente ou plus précise.',
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
    // Cas spécial : IA indisponible en production (Vercel ne peut pas atteindre l'API interne)
    if (error instanceof ZaiUnavailableError) {
      return NextResponse.json(
        {
          error: 'IA indisponible en production',
          message: error.message,
          isProdUnavailable: true,
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      {
        error: 'Erreur lors de la génération de l\'image',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}
