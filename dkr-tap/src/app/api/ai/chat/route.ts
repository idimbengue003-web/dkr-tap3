import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { callGeminiChat } from '@/lib/gemini-api'

/**
 * POST /api/ai/chat — Assistant IA pour aider à créer/personnaliser cartes et QR
 *
 * Body: { message: string, history?: Array<{role: 'user'|'assistant', content: string}> }
 *
 * L'IA a accès au contexte du business (catégories, modèles existants) et peut :
 * - Conseiller des réseaux selon le type de business (salon, resto, boutique...)
 * - Écrire des descriptions pour les annonces
 * - Suggérer des URLs cibles pour chaque réseau (Google Reviews URL, IG profile, etc.)
 * - Écrire des textes d'action (call-to-action) pour les stickers
 * - Expliquer comment configurer une carte QR
 */
export async function POST(request: NextRequest) {
  const guard = await requireAuth(request)
  if (guard) return guard

  try {
    const body = await request.json()
    const userMessage: string = String(body.message || '').trim()
    if (!userMessage) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }
    const history: Array<{ role: 'user' | 'assistant'; content: string }> =
      Array.isArray(body.history) ? body.history.slice(-10) : [] // max 10 messages précédents

    // Récupérer le contexte : catégories + modèles existants
    let categories: any[] = []
    let totalModels = 0
    try {
      categories = await db.listCategories()
      for (const cat of categories) {
        const models = await db.listModels(cat.id)
        totalModels += models.length
      }
    } catch {}

    const categoriesList = categories.map((c) => `- ${c.name} (${c.price.toLocaleString('fr-FR')} FCFA, réseau: ${c.network || 'générique'})`).join('\n') || 'Aucune catégorie encore'

    // System prompt — donne le contexte et les compétences à l'IA
    const systemPrompt = `Tu es DKR TAP Assistant, l'IA du site DKR TAP (cartes QR pour réseaux sociaux au Sénégal, Dakar).

TON RÔLE :
Aider l'admin à créer et personnaliser ses cartes QR + annonces. Tu es expert en marketing digital sénégalais, réseaux sociaux, et configuration de cartes QR.

CONTEXTE DU SITE :
- Site : https://www.dkrtap.site
- Modèle économique : vente de stickers QR physiques qui redirigent vers les réseaux sociaux
- Prix : 3000 FCFA/carte (Google, TikTok, Instagram), 2500 FCFA (WhatsApp, Facebook, Snapchat), 3500 FCFA (YouTube), 5000 FCFA (Personnalisé)
- Remises volume : 17% à 10 cartes, 50% à 20 cartes
- Paiement : Wave Sénégal + système de wallet rechargeable
- Statut de stock par annonce : 'in_stock' (déjà fabriqué) ou 'on_order' (sur commande)

CATÉGORIES EXISTANTES (${categories.length} au total, ${totalModels} modèles) :
${categoriesList}

CE QUE TU PEUX FAIRE :
1. **Conseiller des réseaux** selon le type de business du client
   (salon, restaurant, boutique, prestataire services, marchand, etc.)
2. **Écrire des descriptions d'annonces** courtes et accrocheuses (max 100 mots)
3. **Suggérer des URLs cibles** selon le réseau :
   - Google Reviews : URL de la fiche Google Maps du commerce
   - Instagram : https://instagram.com/votre-compte
   - TikTok : https://tiktok.com/@votre-compte
   - WhatsApp : https://wa.me/221XXXXXXXXX
   - YouTube : https://youtube.com/@votre-chaine
   - Facebook : URL de la page Facebook Business
   - Snapchat : URL du snapcode
4. **Écrire des textes d'action (call-to-action)** pour les stickers :
   - "Laissez-nous 5 étoiles ⭐" (Google)
   - "Abonne-toi pour plus de vidéos 🚀" (TikTok/IG)
   - "Contactez-nous direct 📲" (WhatsApp)
5. **Donner des conseils marketing** : où placer la carte, comment inviter les clients à scanner, etc.
6. **Aider à configurer le statut de stock** : "Sur commande" si fabriqué après paiement, "En stock" si déjà imprimé.

FORMAT DE RÉPONSE :
- Réponds en français (langue du Sénégal)
- Sois concret et actionnable — pas de blabla
- Utilise des emojis modérément pour la lisibilité
- Si l'admin te demande une description d'annonce, réponds JUSTE avec la description (pas de préambule)
- Si on te demande un call-to-action, réponds JUSTE avec le texte
- Pour les conseils marketing, structure avec des puces

EXEMPLES :
- User : "Je vends à un salon de coiffure, quels réseaux ?"
  → Tu réponds : Instagram + TikTok (les gens veulent voir les coupes), Google Reviews (avantages pour trouver le salon)

- User : "Écris une description pour une carte Instagram"
  → Tu réponds : "Augmentez vos followers Instagram. Le QR mène vos clients vers votre profil IG où ils peuvent vous suivre en 1 clic."

- User : "Quelle URL pour Google Reviews ?"
  → Tu expliques comment trouver l'URL de la fiche Google Maps du commerce`

    // Appel à l'API Google Gemini (publique, marche sur Vercel)
    const assistantMessage = await callGeminiChat(systemPrompt, history, userMessage)

    return NextResponse.json({
      message: assistantMessage,
      history: [
        ...history,
        { role: 'user' as const, content: userMessage },
        { role: 'assistant' as const, content: assistantMessage },
      ],
    })
  } catch (error: any) {
    console.error('[POST /api/ai/chat]', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la communication avec l\'IA',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}
