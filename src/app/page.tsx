import Link from 'next/link'
import { ScrollSequence } from '@/components/scroll-sequence'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { db, type Category } from '@/lib/db'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '/scanbridge-logo.svg'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'
// Lien de paiement Wave — l'utilisateur le fournira plus tard
// Format: https://pay.wave.com/... ou un lien personnalisé
const WAVE_URL = process.env.NEXT_PUBLIC_WAVE_PAYMENT_URL || '#commander'

// Modèles de stickers disponibles avec prix en FCFA
const MODELES = [
  {
    name: 'Google Reviews',
    icon: '/network-google.svg',
    color: '#4285F4',
    price: '3 000',
    desc: 'Boostez vos avis Google. Vos clients scannent et laissent une note 5 étoiles en 1 clic.',
    features: ['Page d\'attente aux couleurs Google', 'Redirection vers Google Maps', 'Texte personnalisable'],
  },
  {
    name: 'TikTok',
    icon: '/network-tiktok.svg',
    color: '#25F4EE',
    price: '3 000',
    desc: 'Gagnez des abonnés TikTok. Le QR redirige directement vers votre profil ou une vidéo.',
    features: ['Page d\'attente aux couleurs TikTok', 'Redirection vers votre profil TikTok', 'Texte "Abonne-toi" intégré'],
  },
  {
    name: 'Instagram',
    icon: '/network-instagram.svg',
    color: '#d6299f',
    price: '3 000',
    desc: 'Augmentez vos followers Instagram. Le QR mène vers votre compte ou un post spécifique.',
    features: ['Dégradé Instagram sur la page d\'attente', 'Redirection vers votre profil IG', 'Design aux couleurs IG'],
  },
  {
    name: 'WhatsApp',
    icon: '/network-whatsapp.svg',
    color: '#25D366',
    price: '2 500',
    desc: 'Vos clients vous contactent directement sur WhatsApp Business en scannant le sticker.',
    features: ['Chat direct WhatsApp', 'Numéro pré-rempli', 'Message d\'accueil automatique'],
  },
  {
    name: 'YouTube',
    icon: '/network-youtube.svg',
    color: '#FF0000',
    price: '3 500',
    desc: 'Augmentez vos abonnés YouTube. Redirige vers votre chaîne ou une vidéo spécifique.',
    features: ['Redirection vers votre chaîne', 'Lien vers une vidéo spécifique', 'Page d\'attente YouTube'],
  },
  {
    name: 'Facebook',
    icon: '/network-facebook.svg',
    color: '#1877F2',
    price: '2 500',
    desc: 'Gagnez des fans Facebook et des recommandations sur votre page professionnelle.',
    features: ['Redirection vers votre page FB', 'Bouton "Recommander"', 'Page d\'attente FB'],
  },
  {
    name: 'Personnalisé',
    icon: '/scanbridge-logo.svg',
    color: '#10b981',
    price: '5 000',
    desc: 'Votre propre design, votre propre URL. Importez votre image et placez le QR où vous voulez.',
    features: ['Image 100% personnalisée', 'QR redimensionnable et déplaçable', 'Texte sur l\'image', 'Duplication illimitée'],
  },
  {
    name: 'Snapchat',
    icon: '/network-snapchat.svg',
    color: '#FFFC00',
    price: '2 500',
    desc: 'Ajoutez vos clients sur Snapchat et partagez vos stories.',
    features: ['Redirection vers votre Snap', 'Code Snap intégré', 'Page d\'attente Snapchat'],
  },
]

// Tarifs par quantité (FCFA) — prix dégressifs
const TARIFS = [
  { qty: '1 à 9 cartes', price: '3 000', unit: 'FCFA / carte', desc: 'Prix unitaire standard' },
  { qty: '10 à 19 cartes', price: '2 500', unit: 'FCFA / carte', desc: 'Remise volume', highlight: true },
  { qty: '20 cartes et +', price: '1 500', unit: 'FCFA / carte', desc: 'Meilleur tarif' },
]

// Récupère les catégories côté serveur
async function getCategories(): Promise<Category[]> {
  try { return await db.listCategories() } catch { return [] }
}

export default async function LandingPage() {
  const categories = await getCategories()
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
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-zinc-950 to-zinc-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Disponible maintenant au Sénégal
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            Un scan. <span className="text-emerald-400">Un abonné.</span>
            <br />
            Un avis cinq étoiles.
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Vos cartes QR DKR TAP redirigent vos clients directement vers vos réseaux sociaux.
            TikTok, Instagram, Google, WhatsApp — choisissez votre réseau, on s'occupe du reste.
            Vos clients scannent, votre audience grandit.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={WAVE_URL}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Payer avec Wave
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

          {/* Image hero illustrative */}
          <div className="mt-12 max-w-2xl mx-auto rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl shadow-emerald-500/10">
            <img
              src="/hero-scan.png"
              alt="Smartphone scannant un sticker QR code DKR TAP"
              className="w-full h-auto"
              width={1024}
              height={1024}
            />
          </div>

          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div>
              <p className="text-3xl font-bold text-emerald-400">8+</p>
              <p className="text-sm text-zinc-500">Réseaux disponibles</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-400">24/7</p>
              <p className="text-sm text-zinc-500">Disponible tout le temps</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-400">∞</p>
              <p className="text-sm text-zinc-500">Liens modifiables à volonté</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SCROLL VIDÉO — 3 frames en séquence ===== */}
      <ScrollSequence />

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
                title: 'Choisissez votre modèle',
                desc: 'Sélectionnez le réseau social (Google, TikTok, Instagram, WhatsApp...) et importez votre design.',
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
                desc: 'Page d\'attente branded avec vos couleurs, puis redirection automatique vers votre réseau social.',
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
                desc: 'Changez l\'URL de redirection à tout moment. Le sticker imprimé ne change pas — le lien oui.',
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
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Nos modèles de stickers
          </h2>
          <p className="text-center text-zinc-400 mb-12 max-w-2xl mx-auto">
            Des designs professionnels pour chaque réseau social. Chaque sticker inclut la page d&apos;attente aux couleurs de la marque.
          </p>

          {/* 3 photos placeholders — remplace-les par tes propres images */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {[1, 2, 3].map((n) => (
              <div key={n} className="aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                <ImageWithFallback
                  src={`/model-photo-${n}.png`}
                  alt={`Modèle ${n}`}
                  fallbackText={`Photo ${n} — ajoute /model-photo-${n}.png`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Catégories dynamiques depuis l'admin (si elles existent) */}
          {categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {categories.map((cat) => (
                <div key={cat.id} className="rounded-2xl border border-zinc-800 hover:border-zinc-600 transition-all overflow-hidden bg-zinc-900/50">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-base">{cat.name}</h3>
                      <span className="text-lg font-bold text-emerald-400">
                        {cat.price.toLocaleString('fr-FR')}<span className="text-xs text-zinc-500 font-normal"> FCFA</span>
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed mb-3">{cat.description}</p>
                    )}
                    {cat.imagePath && (
                      <img src={cat.imagePath} alt={cat.name} className="w-full rounded-lg mb-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {MODELES.map((model) => (
                <div key={model.name} className="group rounded-2xl border border-zinc-800 hover:border-zinc-600 transition-all overflow-hidden bg-zinc-900/50">
                  <div className="h-24 flex items-center justify-center" style={{ background: `radial-gradient(circle, ${model.color}25 0%, transparent 70%)` }}>
                    <img src={model.icon} alt={`Logo ${model.name}`} width={48} height={48} className="opacity-90" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-base">{model.name}</h3>
                      <span className="text-lg font-bold" style={{ color: model.color }}>
                        {model.price}<span className="text-xs text-zinc-500 font-normal"> FCFA</span>
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{model.desc}</p>
                    <ul className="space-y-1">
                      {model.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" stroke={model.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <a
              href={WAVE_URL}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors"
            >
              Payer avec Wave
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ===== TARIFS PAR QUANTITÉ ===== */}
      <section id="tarifs" className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Nos tarifs
          </h2>
          <p className="text-center text-zinc-400 mb-12 max-w-2xl mx-auto">
            Prix par carte sticker. Plus tu commandes, moins tu paies.
          </p>

          <div className="space-y-4">
            {TARIFS.map((t) => (
              <div
                key={t.qty}
                className={`flex items-center justify-between gap-4 rounded-2xl p-5 ${t.highlight ? 'border-2 border-emerald-500 bg-emerald-500/5' : 'border border-zinc-800'}`}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{t.qty}</p>
                  <p className="text-xs text-zinc-500">{t.desc}</p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-bold ${t.highlight ? 'text-emerald-400' : 'text-white'}`}>
                    {t.price}
                  </span>
                  <span className="text-sm text-zinc-500 ml-1">{t.unit}</span>
                </div>
                {t.highlight && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-xs font-bold shrink-0">
                    POPULAIRE
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-zinc-500 text-sm mt-8">
            Choisissez votre modèle (Google, TikTok, Instagram, etc.) et commandez la quantité voulue.
            Paiement via Wave ou appel.
          </p>
        </div>
      </section>

      {/* ===== COMMANDER ===== */}
      <section id="commander" className="py-20 px-4 sm:px-6 bg-emerald-500/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Prêt à commander ?
          </h2>
          <p className="text-zinc-400 mb-8">
            Payez avec Wave ou appelez-nous directement. On vous guide étape par étape.
          </p>

          <div className="flex flex-col items-center gap-6">
            {/* Bouton Wave */}
            {WAVE_URL !== '#commander' && (
              <a
                href={WAVE_URL}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-emerald-500 text-black font-bold text-lg hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/30"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <path d="M2 10h20"/>
                </svg>
                Payer avec Wave
              </a>
            )}

            {/* Bouton appel */}
            <a
              href={`tel:${BRAND_PHONE.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-zinc-800 text-white font-bold text-lg hover:bg-zinc-700 transition-colors"
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
              <p className="text-xs text-zinc-500">Stickers QR dynamiques — Dakar, Sénégal</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <a href="#modeles" className="text-zinc-500 hover:text-white transition-colors">Modèles</a>
            <a href="#tarifs" className="text-zinc-500 hover:text-white transition-colors">Tarifs</a>
            <a href="#commander" className="text-zinc-500 hover:text-white transition-colors">Commander</a>
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
