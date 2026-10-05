import Link from 'next/link'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '/scanbridge-logo.svg'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      {/* ===== NAVBAR ===== */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center p-1.5">
              <img src={BRAND_LOGO_URL} alt={`Logo ${BRAND_NAME}`} width={28} height={28} />
            </div>
            <span className="text-xl font-bold tracking-tight">{BRAND_NAME}</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#modeles" className="hover:text-white transition-colors">Modèles</a>
            <a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a>
            <a href="#commander" className="hover:text-white transition-colors">Commander</a>
          </nav>
          <a
            href={`tel:${BRAND_PHONE.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            {BRAND_PHONE}
          </a>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-zinc-950 to-zinc-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Disponible maintenant
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            Vos stickers QR <span className="text-emerald-400">dynamiques</span>
            <br />
            Changez le lien sans réimprimer
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Importez votre design, placez le QR code où vous voulez. Quand un client scanne,
            il est redirigé vers votre page. Modifiez le lien quand vous voulez — le sticker reste le même.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#commander"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Commander mes stickers
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a
              href="#modeles"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors"
            >
              Voir les modèles
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div>
              <p className="text-3xl font-bold text-emerald-400">∞</p>
              <p className="text-sm text-zinc-500">Modifications illimitées</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-400">600ms</p>
              <p className="text-sm text-zinc-500">Redirection ultra-rapide</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-400">24/7</p>
              <p className="text-sm text-zinc-500">Disponible tout le temps</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMMENT ÇA MARCHE ===== */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Comment ça marche
          </h2>
          <p className="text-center text-zinc-400 mb-12 max-w-2xl mx-auto">
            3 étapes simples pour avoir vos stickers QR pro et dynamiques
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: '1',
                title: 'Importez votre design',
                desc: 'Uploadez votre image (logo, flyer, affiche). Le QR code est placé où vous voulez sur l\'image.',
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                ),
              },
              {
                num: '2',
                title: 'Le client scanne',
                desc: 'Page d\'attente branded avec votre logo, puis redirection automatique vers votre réseau social.',
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                    <path d="M14 14h7v7h-7z"/>
                  </svg>
                ),
              },
              {
                num: '3',
                title: 'Modifiez quand vous voulez',
                desc: 'Changez l\'URL de redirection à tout moment depuis l\'admin. Le sticker imprimé ne change pas.',
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                  </svg>
                ),
              },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  {step.icon}
                </div>
                <div className="text-sm font-bold text-emerald-400 mb-2">ÉTAPE {step.num}</div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MODÈLES ===== */}
      <section id="modeles" className="py-20 px-4 sm:px-6 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Nos modèles de stickers
          </h2>
          <p className="text-center text-zinc-400 mb-12 max-w-2xl mx-auto">
            Des designs professionnels pour chaque réseau social. Importez le vôtre ou utilisez les nôtres.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Google Reviews', color: '#4285F4', emoji: '⭐', desc: 'Boostez vos avis Google' },
              { name: 'TikTok', color: '#25F4EE', emoji: '🚀', desc: 'Abonnez vos clients' },
              { name: 'Instagram', color: '#d6299f', emoji: '📸', desc: 'Suivez votre compte' },
              { name: 'Personnalisé', color: '#10b981', emoji: '✨', desc: 'Votre propre design' },
              { name: 'WhatsApp', color: '#25D366', emoji: '💬', desc: 'Chat direct client' },
              { name: 'YouTube', color: '#FF0000', emoji: '▶️', desc: 'Abonnez à votre chaîne' },
            ].map((model) => (
              <div
                key={model.name}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6"
                  style={{ background: `radial-gradient(circle at center, ${model.color}15 0%, transparent 70%)` }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${model.color}20`, color: model.color }}
                  >
                    {model.emoji}
                  </div>
                  <h3 className="font-semibold">{model.name}</h3>
                  <p className="text-xs text-zinc-500 text-center">{model.desc}</p>
                </div>
                {/* QR placeholder */}
                <div className="absolute bottom-4 right-4 w-12 h-12 rounded-lg bg-white/90 p-1.5 group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                    <path d="M14 14h7v7h-7z"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-zinc-500 text-sm mt-8">
            Vous avez votre propre design ? Importez-le directement — le QR code s'ajoute automatiquement.
          </p>
        </div>
      </section>

      {/* ===== TARIFS ===== */}
      <section id="tarifs" className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Tarifs simples
          </h2>
          <p className="text-center text-zinc-400 mb-12 max-w-2xl mx-auto">
            Choisissez le plan qui vous convient. Sans engagement.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="rounded-2xl border border-zinc-800 p-6 flex flex-col">
              <h3 className="text-lg font-bold mb-1">Starter</h3>
              <p className="text-sm text-zinc-500 mb-4">Pour démarrer</p>
              <p className="text-3xl font-bold mb-1">Gratuit</p>
              <p className="text-sm text-zinc-500 mb-6">Jusqu'à 3 stickers</p>
              <ul className="space-y-2 text-sm text-zinc-400 mb-6 flex-1">
                <li className="flex items-center gap-2"><Check /> 3 stickers QR</li>
                <li className="flex items-center gap-2"><Check /> Modèles de base</li>
                <li className="flex items-center gap-2"><Check /> Modification illimitée</li>
                <li className="flex items-center gap-2 text-zinc-600"><Cross /> Design personnalisé</li>
                <li className="flex items-center gap-2 text-zinc-600"><Cross /> Support prioritaire</li>
              </ul>
              <a
                href="#commander"
                className="text-center py-2.5 rounded-lg bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
              >
                Commencer
              </a>
            </div>

            {/* Pro (highlighted) */}
            <div className="rounded-2xl border-2 border-emerald-500 p-6 flex flex-col relative -mt-2">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-black text-xs font-bold">
                POPULAIRE
              </div>
              <h3 className="text-lg font-bold mb-1">Pro</h3>
              <p className="text-sm text-zinc-500 mb-4">Pour les commerçants actifs</p>
              <p className="text-3xl font-bold mb-1">9,99€<span className="text-base font-normal text-zinc-500">/mois</span></p>
              <p className="text-sm text-zinc-500 mb-6">Stickers illimités</p>
              <ul className="space-y-2 text-sm text-zinc-400 mb-6 flex-1">
                <li className="flex items-center gap-2"><Check /> Stickers illimités</li>
                <li className="flex items-center gap-2"><Check /> Design personnalisé</li>
                <li className="flex items-center gap-2"><Check /> Texte sur l'image</li>
                <li className="flex items-center gap-2"><Check /> Redimensionnement QR</li>
                <li className="flex items-center gap-2"><Check /> Stats détaillées</li>
              </ul>
              <a
                href="#commander"
                className="text-center py-2.5 rounded-lg bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-colors"
              >
                Choisir Pro
              </a>
            </div>

            {/* Business */}
            <div className="rounded-2xl border border-zinc-800 p-6 flex flex-col">
              <h3 className="text-lg font-bold mb-1">Business</h3>
              <p className="text-sm text-zinc-500 mb-4">Pour les agences & réseaux</p>
              <p className="text-3xl font-bold mb-1">49,99€<span className="text-base font-normal text-zinc-500">/mois</span></p>
              <p className="text-sm text-zinc-500 mb-6">Multi-comptes</p>
              <ul className="space-y-2 text-sm text-zinc-400 mb-6 flex-1">
                <li className="flex items-center gap-2"><Check /> Tout le plan Pro</li>
                <li className="flex items-center gap-2"><Check /> Comptes multiples</li>
                <li className="flex items-center gap-2"><Check /> Domaine personnalisé</li>
                <li className="flex items-center gap-2"><Check /> Support prioritaire 24/7</li>
                <li className="flex items-center gap-2"><Check /> API d'intégration</li>
              </ul>
              <a
                href="#commander"
                className="text-center py-2.5 rounded-lg bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
              >
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMMANDER ===== */}
      <section id="commander" className="py-20 px-4 sm:px-6 bg-emerald-500/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Prêt à commander ?
          </h2>
          <p className="text-zinc-400 mb-8">
            Appelez-nous directement ou envoyez un message. On vous guide étape par étape.
          </p>

          <div className="flex flex-col items-center gap-6">
            <a
              href={`tel:${BRAND_PHONE.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-emerald-500 text-black font-bold text-lg hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/30"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              {BRAND_PHONE}
            </a>

            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Réponse rapide, en général sous 2h
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="mt-auto bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center p-1.5">
              <img src={BRAND_LOGO_URL} alt="" width={20} height={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">{BRAND_NAME}</p>
              <p className="text-xs text-zinc-500">Stickers QR dynamiques</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <a href="#modeles" className="text-zinc-500 hover:text-white transition-colors">Modèles</a>
            <a href="#tarifs" className="text-zinc-500 hover:text-white transition-colors">Tarifs</a>
            <a href="#commander" className="text-zinc-500 hover:text-white transition-colors">Commander</a>
            {/* Lien admin discret — petit, gris foncé, pas évident */}
            <Link
              href="/admin"
              className="text-zinc-700 hover:text-zinc-400 transition-colors text-xs"
              title="Espace gestion"
            >
              Gestion
            </Link>
          </div>

          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} {BRAND_NAME}. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  )
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function Cross() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
