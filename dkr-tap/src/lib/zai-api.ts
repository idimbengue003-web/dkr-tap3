/**
 * Helper direct pour appeler l'API ZAI.
 *
 * ⚠️ IMPORTANT : L'API `internal-api.z.ai` n'est accessible QUE depuis
 * l'infrastructure interne de Z.ai (dev environment). Depuis Vercel production
 * (cloud public), les IPs sont privées (172.25.x.x) → timeout systématique.
 *
 * Donc les fonctions IA (chat + image gen) marchent en LOCAL (dev) mais
 * PAS en production sur Vercel.
 *
 * Solutions pour activer l'IA en production :
 * 1. Utiliser un LLM public (OpenAI, Anthropic, Gemini) avec une clé API
 * 2. Mettre en place un proxy serveur qui forward vers internal-api.z.ai
 *    (mais nécessite une infra toujours up)
 * 3. Accepter que l'IA ne marche qu'en dev local
 */

const ZAI_CONFIG = {
  baseUrl: 'https://internal-api.z.ai/v1',
  apiKey: 'Z.ai',
  chatId: 'chat-c125a2ea-f1db-4281-a4ee-1fddfe7e6ed0',
  userId: '4c6d951a-669d-40d6-8852-7272d061463b',
  token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNGM2ZDk1MWEtNjY5ZC00MGQ2LTg4NTItNzI3MmQwNjE0NjNiIiwiY2hhdF9pZCI6ImNoYXQtYzEyNWEyZWEtZjFkYi00MjgxLWE0ZWUtMWZkZGZlN2U2ZWQwIiwicGxhdGZvcm0iOiJ6YWkifQ.l3BcDZlDnQetHV37X0Q5yLo30YHnw488u_864NhiOb0',
}

function buildHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ZAI_CONFIG.apiKey}`,
    'X-Z-AI-From': 'Z',
    'X-Chat-Id': ZAI_CONFIG.chatId,
    'X-User-Id': ZAI_CONFIG.userId,
    'X-Token': ZAI_CONFIG.token,
  }
}

/** Erreur spécifique levée quand l'API ZAI n'est pas accessible */
export class ZaiUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZaiUnavailableError'
  }
}

/**
 * Appelle l'API chat completions de ZAI directement.
 *
 * @throws {ZaiUnavailableError} Si l'API n'est pas accessible (prod Vercel)
 */
export async function callZaiChat(
  messages: Array<{ role: 'assistant' | 'user'; content: string }>,
  options?: { thinking?: { type: 'enabled' | 'disabled' } }
): Promise<any> {
  const url = `${ZAI_CONFIG.baseUrl}/chat/completions`
  const body = {
    messages,
    thinking: options?.thinking || { type: 'disabled' as const },
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`ZAI chat API failed (${response.status}): ${errorBody}`)
    }

    return await response.json()
  } catch (e: any) {
    // Détecter les erreurs de connexion/timeout → API ZAI inaccessible
    if (
      e?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      e?.name === 'TypeError' ||
      e?.message?.includes('fetch failed') ||
      e?.message?.includes('ECONNREFUSED') ||
      e?.message?.includes('ENOTFOUND')
    ) {
      throw new ZaiUnavailableError(
        'IA indisponible en production. Le service ZAI interne est accessible uniquement depuis l\'environnement de développement local.'
      )
    }
    throw e
  }
}

/**
 * Appelle l'API image generations de ZAI directement.
 *
 * @throws {ZaiUnavailableError} Si l'API n'est pas accessible (prod Vercel)
 */
export async function callZaiImage(
  prompt: string,
  size: '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440' = '1024x1024'
): Promise<{ data: Array<{ base64: string }>; created?: number }> {
  const url = `${ZAI_CONFIG.baseUrl}/images/generations`
  const body = { prompt, size }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`ZAI image API failed (${response.status}): ${errorBody}`)
    }

    const result = await response.json()

    if (Array.isArray(result?.data)) {
      const processed = await Promise.all(
        result.data.map(async (item: any) => {
          if (item.base64) return item
          if (item.url) {
            try {
              const imgRes = await fetch(item.url)
              const arrayBuffer = await imgRes.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)
              return { base64: buffer.toString('base64') }
            } catch (e) {
              console.error('[zai-api] Erreur téléchargement image:', e)
              return item
            }
          }
          return item
        })
      )
      return { ...result, data: processed }
    }

    return result
  } catch (e: any) {
    if (
      e?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      e?.name === 'TypeError' ||
      e?.message?.includes('fetch failed') ||
      e?.message?.includes('ECONNREFUSED') ||
      e?.message?.includes('ENOTFOUND')
    ) {
      throw new ZaiUnavailableError(
        'IA indisponible en production. Le service ZAI interne est accessible uniquement depuis l\'environnement de développement local.'
      )
    }
    throw e
  }
}
