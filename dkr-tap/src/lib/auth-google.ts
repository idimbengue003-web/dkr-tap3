import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

/**
 * Configuration NextAuth (Google OAuth) — pour que les acheteurs/revendeurs
 * puissent se connecter avec leur compte Google et retrouver leurs commandes
 * + modifier le lien de redirection de leurs stickers.
 *
 * Variables d'environnement requises :
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - NEXTAUTH_SECRET (clé JWT pour signer la session)
 * - NEXTAUTH_URL (URL publique du site, ex: https://www.dkrtap.site)
 *
 * Setup Google OAuth :
 * 1. https://console.cloud.google.com/ → "APIs & Services" → "Credentials"
 * 2. Créer un "OAuth client ID" de type "Web application"
 * 3. Authorized redirect URIs : ajouter
 *    https://<TON-DOMAINE>/api/auth/callback/google
 * 4. Copier Client ID + Client Secret dans les env vars Vercel
 */

const isProd = process.env.NODE_ENV === 'production'
// Préfixe __Secure- (moins restrictif que __Host-) — permet d'éviter les
// problèmes de cookies non reçus en retour après l'OAuth callback sur Vercel.
const cookiePrefix = isProd ? '__Secure-' : ''

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-me-in-production',
  // ⚠️ trustHost: true est CRITIQUE sur Vercel
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  // Cookies explicites avec préfixe __Secure- (au lieu de __Host- par défaut)
  // __Secure- est moins restrictif et permet aux cookies d'être renvoyés
  // après le redirect Google (qui est un cross-site navigation).
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
    csrfToken: {
      name: `${cookiePrefix}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}next-auth.pkce.code-verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
        maxAge: 60 * 5, // 5 minutes (le OAuth callback doit arriver dans cette fenêtre)
      },
    },
    state: {
      name: `${cookiePrefix}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
        maxAge: 60 * 5,
      },
    },
    nonce: {
      name: `${cookiePrefix}next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
  },
  // Logger détaillé pour capter toutes les erreurs OAuth
  logger: {
    error(error: any) {
      // L'erreur NextAuth peut être un Error classique ou un objet NextAuth Error
      // On logge TOUT ce qu'on peut pour le debug
      console.error('==========[NEXTAUTH ERROR]==========')
      console.error('Type:', typeof error)
      console.error('Constructor:', error?.constructor?.name)
      console.error('Name:', error?.name)
      console.error('Message:', error?.message)
      console.error('Code:', error?.code)
      console.error('Stack:', error?.stack)
      try {
        console.error('Full JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2))
      } catch {
        console.error('String repr:', String(error))
      }
      console.error('===================================')
    },
    warn(code: string) {
      console.warn('[next-auth WARN]', code)
    },
    debug(message: string, metadata?: any) {
      // Log seulement les messages importants
      if (typeof message === 'string' && (message.includes('error') || message.includes('callback') || message.includes('oauth') || message.includes('cookie'))) {
        console.log('[next-auth DEBUG]', message, metadata ? JSON.stringify(metadata).slice(0, 800) : '')
      }
    },
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.email = user.email
        token.name = user.name
        token.picture = user.image
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
        token.isAdmin = adminEmails.includes((user.email || '').toLowerCase())
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
        ;(session.user as any).isAdmin = !!token.isAdmin
      }
      return session
    },
  },
  pages: {
    signIn: '/account',
    error: '/account?error=1',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
