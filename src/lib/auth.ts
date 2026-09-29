import { NextRequest } from 'next/server'

/**
 * Authentification simple par mot de passe.
 *
 * Approche : token stateless = `${exp}.${hmac}` signé avec ADMIN_PASSWORD.
 * Pas de session côté serveur, pas de base de données.
 * Le cookie est httpOnly + SameSite=Lax pour empêcher le vol par XSS.
 */

const COOKIE_NAME = 'qr_admin_session'
const SESSION_HOURS = Number(process.env.AUTH_SESSION_HOURS ?? '24')

function getAdminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) {
    throw new Error('ADMIN_PASSWORD non configuré')
  }
  return pw
}

/**
 * Vrai si l'admin a configuré un mot de passe (sinon on bloque tout).
 */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD)
}

/**
 * Vérifie qu'un mot de passe candidat correspond à ADMIN_PASSWORD
 * en temps constant (pour éviter les timing attacks).
 */
export function verifyPassword(candidate: string): boolean {
  try {
    const expected = getAdminPassword()
    if (candidate.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < candidate.length; i++) {
      diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    return diff === 0
  } catch {
    return false
  }
}

/**
 * Signe un message avec le secret (HMAC-SHA256 via Web Crypto).
 * Retourne le hex digest.
 */
async function sign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getAdminPassword()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  )
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Crée un token de session : `${exp}.${hmac}` où exp est un timestamp ms.
 */
export async function createSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  const hmac = await sign(`session:${exp}`)
  return `${exp}.${hmac}`
}

/**
 * Vérifie qu'un token est valide (signature correcte + non expiré).
 * Comparaison timing-safe de la signature.
 */
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return false
    const expStr = parts[0]
    const receivedHmac = parts[1]
    const exp = Number(expStr)
    if (!Number.isFinite(exp) || exp < Date.now()) return false

    const expectedHmac = await sign(`session:${expStr}`)
    if (receivedHmac.length !== expectedHmac.length) return false
    let diff = 0
    for (let i = 0; i < receivedHmac.length; i++) {
      diff |= receivedHmac.charCodeAt(i) ^ expectedHmac.charCodeAt(i)
    }
    return diff === 0
  } catch {
    return false
  }
}

/**
 * Extrait et valide le token depuis le cookie de la requête.
 * Retourne true si l'utilisateur est authentifié.
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  if (!isAuthConfigured()) return false
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return false
  return verifySessionToken(token)
}

export const AUTH_COOKIE_NAME = COOKIE_NAME
export const AUTH_MAX_AGE_SECONDS = SESSION_HOURS * 60 * 60
