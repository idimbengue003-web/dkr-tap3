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
 * - gemini-3.8-flash : chat rapide, peu coûteux
 * - gemini-2.0-flash-exp : génère images multi-modal (avec responseModalities)
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Gemini chat API failed (${response.status}): ${errBody}`)
  }

  const data = await response.json()

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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Gemini image API failed (${response.status}): ${errBody}`)
  }

  const data = await response.json()

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
