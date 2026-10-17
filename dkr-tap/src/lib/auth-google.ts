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

// Détection environnement production (HTTPS + cookies sécurisés)
const isProd = process.env.NODE_ENV === 'production'

// Préfixe __Secure- requis en prod pour que le cookie soit accepté en HTTPS
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
  // ⚠️ trustHost: true est CRITIQUE sur Vercel — sinon NextAuth ne truste pas
  // l'URL du host envoyée par Vercel (qui passe par un proxy HTTPS) et
  // la session n'est pas correctement persistée après l'OAuth callback.
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  // Cookies explicites — sameSite 'lax' pour compatibilité OAuth redirect
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
      },
    },
    state: {
      name: `${cookiePrefix}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
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
  callbacks: {
    async jwt({ token, account, user }) {
      // Premier login : on enregistre l'email et l'admin flag dans le token
      if (account && user) {
        token.email = user.email
        token.name = user.name
        token.picture = user.image
        // Admin = si l'email correspond à l'admin autorisé (configurable via env var)
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
