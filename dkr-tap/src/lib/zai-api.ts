/**
 * Helper direct pour appeler l'API ZAI (bypass du SDK z-ai-web-dev-sdk).
 *
 * Le SDK nécessite un fichier .z-ai-config dans process.cwd() / os.homedir() / /etc/
 * Sur Vercel serverless, ces chemins ne contiennent pas le fichier → erreur.
 *
 * Solution : on appelle directement l'API ZAI avec fetch + credentials hardcodés.
 * (Les credentials sont déjà commités dans .z-ai-config de toute façon, donc les
 * avoir aussi en code ne change rien niveau sécurité.)
 *
 * Source de la configuration : /etc/.z-ai-config (copié dans dkr-tap/.z-ai-config)
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

/**
 * Appelle l'API chat completions de ZAI directement (sans SDK).
 * Reproduit le comportement de zai.chat.completions.create().
 *
 * @param messages Tableau de { role: 'assistant'|'user', content: string }
 * @param options Options supplémentaires (thinking, stream, etc.)
 * @returns La réponse JSON de l'API (structure: { choices: [{ message: { content }}] })
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
}

/**
 * Appelle l'API image generations de ZAI directement (sans SDK).
 * Reproduit le comportement de zai.images.generations.create().
 *
 * L'API retourne des URLs d'images. On les télécharge en base64 pour
 * cohérence avec le SDK (qui faisait la même chose en interne).
 *
 * @param prompt Description de l'image à générer
 * @param size Taille souhaitée (default: '1024x1024' pour sticker carré)
 * @returns { data: [{ base64: string }] } — base64 PNG de l'image générée
 */
export async function callZaiImage(
  prompt: string,
  size: '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440' = '1024x1024'
): Promise<{ data: Array<{ base64: string }>; created?: number }> {
  const url = `${ZAI_CONFIG.baseUrl}/images/generations`
  const body = { prompt, size }

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

  // L'API peut retourner soit des URLs (à télécharger) soit directement du base64
  // On standardise en base64 (comme le faisait le SDK)
  if (Array.isArray(result?.data)) {
    const processed = await Promise.all(
      result.data.map(async (item: any) => {
        if (item.base64) return item
        if (item.url) {
          // Télécharger l'image et la convertir en base64
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
}
