import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated, isAuthConfigured } from '@/lib/auth'

/**
 * Garde d'authentification pour les routes API admin.
 *
 * Retourne `null` si authentifié, sinon une réponse NextResponse 401 prête à renvoyer.
 *
 * Usage :
 * ```
 * const guard = await requireAuth(request)
 * if (guard) return guard
 * // ... logique de la route
 * ```
 */
export async function requireAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  // Si ADMIN_PASSWORD n'est pas configuré → on bloque par défaut
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: 'Authentification non configurée' },
      { status: 503 }
    )
  }

  if (!(await isAuthenticated(request))) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer' },
      }
    )
  }

  return null
}
