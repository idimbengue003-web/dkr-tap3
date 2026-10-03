import { NextRequest, NextResponse } from 'next/server'
import {
  verifyPassword,
  createSessionToken,
  isAuthConfigured,
  AUTH_COOKIE_NAME,
  AUTH_MAX_AGE_SECONDS,
} from '@/lib/auth'

// POST /api/auth/login
// Body: { password: string }
// Succès 200 → set cookie httpOnly + retourne { ok: true }
// Échec 401 → { ok: false, error: 'Mot de passe incorrect' }
export async function POST(request: NextRequest) {
  // Si ADMIN_PASSWORD n'est pas configuré, on bloque tout
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Authentification non configurée (ADMIN_PASSWORD manquant)' },
      { status: 503 }
    )
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Corps de requête invalide (JSON attendu)' },
      { status: 400 }
    )
  }

  const password = typeof body.password === 'string' ? body.password : ''
  if (!password) {
    return NextResponse.json(
      { ok: false, error: 'Mot de passe manquant' },
      { status: 400 }
    )
  }

  if (!verifyPassword(password)) {
    // Petit délai artificiel pour ralentir les attaques brute-force
    await new Promise((r) => setTimeout(r, 300))
    return NextResponse.json(
      { ok: false, error: 'Mot de passe incorrect' },
      { status: 401 }
    )
  }

  const token = await createSessionToken()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_MAX_AGE_SECONDS,
  })
  return response
}
