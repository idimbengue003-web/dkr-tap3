import { NextRequest, NextResponse } from 'next/server'
import { store } from './db'

/**
 * Authentification des CLIENTS (multi-tenant).
 * Séparée de l'auth admin (cookie différent, méthode différente).
 *
 * Stockage KV :
 *   user:<email> → { id, email, name, passwordHash, createdAt }
 *   userId:<id>  → email (mapping)
 *   users:list    → liste JSON des user IDs (pour l'admin qui liste les clients)
 */

const CLIENT_COOKIE_NAME = 'dkrtap_client_session'
const CLIENT_SESSION_HOURS = Number(process.env.AUTH_SESSION_HOURS ?? '168') // 7 jours par défaut pour les clients

type ClientUser = {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: string
}

function getClientPassword(): string {
  return process.env.ADMIN_PASSWORD || 'dkr-tap-secret-key'
}

// Hash password avec SHA-256 + salt (le "salt" est le mot de passe admin, partagé)
async function hashPassword(password: string): Promise<string> {
  const salt = getClientPassword()
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Vérifie le mot de passe en temps constant
function verifyPassword(candidate: string, expected: string): boolean {
  if (candidate.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

async function createClientSessionToken(userId: string): Promise<string> {
  const exp = Date.now() + CLIENT_SESSION_HOURS * 60 * 60 * 1000
  const message = `client:${userId}:${exp}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getClientPassword()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  const hmac = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${exp}.${userId}.${hmac}`
}

async function verifyClientSessionToken(token: string): Promise<string | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [expStr, userId, receivedHmac] = parts
    const exp = Number(expStr)
    if (!Number.isFinite(exp) || exp < Date.now()) return null

    const message = `client:${userId}:${expStr}`
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(getClientPassword()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
    const expectedHmac = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (receivedHmac.length !== expectedHmac.length) return null
    let diff = 0
    for (let i = 0; i < receivedHmac.length; i++) {
      diff |= receivedHmac.charCodeAt(i) ^ expectedHmac.charCodeAt(i)
    }
    if (diff !== 0) return null
    return userId
  } catch {
    return null
  }
}

export function isClientAuthConfigured(): boolean {
  return true // toujours configuré (utilise ADMIN_PASSWORD comme clé HMAC)
}

export async function registerClient(email: string, password: string, name: string): Promise<{ ok: boolean; error?: string; user?: ClientUser }> {
  const emailLower = email.toLowerCase().trim()
  if (!emailLower || !password || !name.trim()) {
    return { ok: false, error: 'Email, mot de passe et nom requis' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    return { ok: false, error: 'Email invalide' }
  }
  if (password.length < 6) {
    return { ok: false, error: 'Mot de passe trop court (min 6 caractères)' }
  }

  // Vérifier si l'email existe déjà
  const existing = await store.get<ClientUser>(`user:${emailLower}`)
  if (existing) {
    return { ok: false, error: 'Un compte existe déjà avec cet email' }
  }

  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString()

  const user: ClientUser = {
    id,
    email: emailLower,
    name: name.trim(),
    passwordHash,
    createdAt: now,
  }

  await store.set(`user:${emailLower}`, user)
  await store.set(`userId:${id}`, emailLower)

  // Ajouter à la liste des users (pour l'admin)
  const userList = (await store.get<string[]>('users:list')) || []
  userList.unshift(id)
  await store.set('users:list', userList)

  return { ok: true, user }
}

export async function loginClient(email: string, password: string): Promise<{ ok: boolean; error?: string; token?: string; user?: { id: string; email: string; name: string } }> {
  const emailLower = email.toLowerCase().trim()
  if (!emailLower || !password) {
    return { ok: false, error: 'Email et mot de passe requis' }
  }

  const user = await store.get<ClientUser>(`user:${emailLower}`)
  if (!user) {
    await new Promise((r) => setTimeout(r, 300))
    return { ok: false, error: 'Email ou mot de passe incorrect' }
  }

  const candidateHash = await hashPassword(password)
  if (!verifyPassword(candidateHash, user.passwordHash)) {
    await new Promise((r) => setTimeout(r, 300))
    return { ok: false, error: 'Email ou mot de passe incorrect' }
  }

  const token = await createClientSessionToken(user.id)
  return {
    ok: true,
    token,
    user: { id: user.id, email: user.email, name: user.name },
  }
}

export async function getClientUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(CLIENT_COOKIE_NAME)?.value
  if (!token) return null
  return verifyClientSessionToken(token)
}

export async function getClientUser(request: NextRequest): Promise<{ id: string; email: string; name: string } | null> {
  const userId = await getClientUserId(request)
  if (!userId) return null
  const email = await store.get<string>(`userId:${userId}`)
  if (!email) return null
  const user = await store.get<ClientUser>(`user:${email}`)
  if (!user) return null
  return { id: user.id, email: user.email, name: user.name }
}

export function setClientSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(CLIENT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CLIENT_SESSION_HOURS * 60 * 60,
  })
  return response
}

export function clearClientSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(CLIENT_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

export const CLIENT_COOKIE = CLIENT_COOKIE_NAME
