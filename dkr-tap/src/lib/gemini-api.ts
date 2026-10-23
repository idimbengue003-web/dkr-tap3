/**
 * Helper pour appeler l'API Google Gemini.
 *
 * Google Gemini API publique — accessible depuis n'importe quel serveur
 * (Vercel inclus), contrairement à l'API interne ZAI.
 *
 * Free tier : 15 req/min, 1500 req/jour (suffisant pour un usage admin).
 * Documentation : https://ai.google.dev/gemini-api/docs
 *
 * Endpoint de base : https://generativelanguage.googleapis.com/v1beta
 *
 * Modèles utilisés (vérifiés le 2025-10) :
 * - gemini-3.8-flash : chat rapide, peu coûteux (peut être en surcharge 503)
 * - gemini-2.0-flash-exp : génère images multi-modal (avec responseModalities)
 *
 * ⚠️ Le modèle gemini-3.8-flash peut retourner 503 ("high demand") →
 * on implémente une logique de retry avec backoff exponentiel.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

/** Attendre N millisecondes (Promise) */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Helper interne : fait un fetch POST à Gemini avec retry automatique.
 * Réessaie en cas de 503 (modèle en surcharge), 429 (rate limit), ou erreur réseau.
 *
 * @param url URL complète (avec clé API)
 * @param body Body JSON à envoyer
 * @param maxRetries Nombre max de tentatives (default 3)
 * @returns La réponse JSON parsée
 */
async function fetchWithRetry(url: string, body: any, maxRetries = 3): Promise<any> {
  let lastError: any = null
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        return await response.json()
      }

      const errBody = await response.text()
      const errStatus = response.status

      // 503 = surcharge, 429 = rate limit → retryable
      if ((errStatus === 503 || errStatus === 429) && attempt < maxRetries) {
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 8000) // 1s, 2s, 4s (max 8s)
        console.warn(`[gemini] Tentative ${attempt}/${maxRetries} échouée (${errStatus}). Retry dans ${waitMs}ms...`)
        await sleep(waitMs)
        continue
      }

      // Erreur non-retryable ou max tentatives atteint
      throw new Error(`Gemini API failed (${errStatus}): ${errBody}`)
    } catch (e: any) {
      lastError = e
      // Erreur réseau (fetch failed, timeout) → retry aussi
      if (
        (e?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
          e?.name === 'TypeError' ||
          e?.message?.includes('fetch failed')) &&
        attempt < maxRetries
      ) {
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 8000)
        console.warn(`[gemini] Tentative ${attempt}/${maxRetries} — erreur réseau. Retry dans ${waitMs}ms...`)
        await sleep(waitMs)
        continue
      }
      throw e
    }
  }
  throw lastError || new Error('fetchWithRetry: toutes les tentatives ont échoué')
}

/**
 * Appelle Gemini pour du chat textuel.
 *
 * @param systemPrompt Prompt système (contexte, persona)
 * @param history Messages précédents (tableau de {role, content})
 * @param userMessage Message de l'utilisateur
 * @returns Le texte de réponse de Gemini
 */
export async function callGeminiChat(
  systemPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY non configurée. Ajoutez la variable d\'environnement GEMINI_API_KEY sur Vercel.')
  }
  const url = `${GEMINI_BASE_URL}/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`

  // Gemini utilise "contents" avec role 'user' ou 'model' (pas 'assistant')
  // Le system prompt est mis dans "systemInstruction"
  const contents = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ]

  const body = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
    },
  }

  const data = await fetchWithRetry(url, body, 3)

  // Structure de réponse Gemini :
  // { candidates: [{ content: { parts: [{ text: "..." }] } }] }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    console.error('[gemini] Réponse inattendue:', JSON.stringify(data).slice(0, 500))
    throw new Error('Gemini n\'a pas retourné de texte')
  }

  return text
}

/**
 * Appelle Gemini pour générer une image à partir d'une description textuelle.
 *
 * Utilise le modèle gemini-2.0-flash-exp qui supporte l'output image
 * (avec responseModalities: ['TEXT', 'IMAGE']).
 *
 * @param prompt Description de l'image à générer
 * @returns Base64 PNG de l'image générée (sans le préfixe data:image/png;base64,)
 */
export async function callGeminiImage(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY non configurée. Ajoutez la variable d\'environnement GEMINI_API_KEY sur Vercel.')
  }
  const url = `${GEMINI_BASE_URL}/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  }

  const data = await fetchWithRetry(url, body, 3)

  // La réponse peut contenir plusieurs parts (text + image)
  // On cherche la part avec inlineData (image en base64)
  const parts = data?.candidates?.[0]?.content?.parts || []
  for (const part of parts) {
    if (part.inlineData?.data) {
      return part.inlineData.data // base64 sans préfixe
    }
  }

  // Si pas d'image inline, peut-être que Gemini a renvoyé du texte explicatif
  const textResponse = parts.find((p: any) => p.text)?.text
  throw new Error(
    `Gemini n'a pas généré d'image. Réponse: ${
      textResponse ? textResponse.slice(0, 200) : 'inconnue'
    }`
  )
}
