import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated, isAuthConfigured } from '@/lib/auth'

// GET /api/auth/check
// Retourne l'état d'authentification courant.
// { configured: boolean, authenticated: boolean }
export async function GET(request: NextRequest) {
  const configured = isAuthConfigured()
  const authenticated = await isAuthenticated(request)
  return NextResponse.json({ configured, authenticated })
}
