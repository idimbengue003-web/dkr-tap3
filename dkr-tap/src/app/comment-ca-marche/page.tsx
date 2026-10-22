import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { ShoppingCart, QrCode, Settings, Truck, Phone } from 'lucide-react'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '/dkrtap-logo.png'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

const STEPS = [
  {
    num: 1,
    title: 'Choisissez vos cartes',
    desc: 'Sélectionnez vos réseaux sociaux (Instagram, TikTok, Google Reviews, etc.) et la quantité souhaitée. Profitez de remises automatiques dès 10 cartes (-17%) et 20 cartes (-50%).',
    icon: ShoppingCart,
    details: [
      'Pack Revendeur recommandé : 5 Instagram + 2 Snapchat + 3 Facebook + 2 YouTube = 12 cartes (-17% de remise auto)',
      'Paiement 100% sécurisé via Wave Sénégal ou avec votre solde wallet',
      'Aucune carte bancaire requise — paiement Wave directement',
    ],
  },
  {
    num: 2,
    title: 'Payez via Wave ou votre solde',
    desc: 'Rechargez votre solde wallet une fois (5000, 10000, 20000 FCFA ou montant perso) OU payez directement via Wave. Détection automatique du paiement en 15-30 secondes.',
    icon: QrCode,
    details: [
      'Solde wallet : payez instantanément vos futures commandes sans repasser par Wave',
      'Polling automatique via l\'API Wave Business — pas besoin de valider manuellement',
      'Vos cartes QR sont créées immédiatement après commande (visibles dans Mon compte)',
    ],
  },
  {
    num: 3,
    title: 'Recevez et configurez vos cartes',
    desc: 'Vos cartes physiques sont livrées à votre adresse (Dakar, Pikine, Thies...). Connectez-vous à votre compte pour configurer le lien de redirection de chaque carte.',
    icon: Truck,
    details: [
      'Livraison à Dakar sous 24-48h, autres villes sous 2-4 jours',
      'Configurable à tout moment dans /account — modifiez l\'URL autant de fois que vous voulez',
      'Le QR imprimé ne change pas, mais le lien de redirection oui — illimité !',
    ],
  },
  {
    num: 4,
    title: 'Vos clients scannent, votre audience grandit',
    desc: 'Vos clients scannent le QR code sur la carte → page d\'attente branded → redirigés automatiquement vers votre réseau social. Vous gagnez des abonnés/avis à chaque scan !',
    icon: Settings,
    details: [
      'Page d\'attente branded avec le logo DKR TAP et les couleurs du réseau',
      'Redirection automatique en 600ms (temps de chargement optimisé)',
      'Statistiques de scans disponibles dans votre compte (visible prochainement)',
    ],
  },
]

export default function CommentCaMarchePage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      <Navbar brandName={BRAND_NAME} brandLogo={BRAND_LOGO_URL} brandPhone={BRAND_PHONE} categories={[]} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Comment ça marche ?
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            {BRAND_NAME} vous permet d'augmenter votre audience sur les réseaux sociaux en un seul scan. Process simple en 4 étapes.
          </p>
        </div>

        {/* Étapes */}
        <div className="space-y-8">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <div key={step.num} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Icon size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Étape {step.num}</div>
                    <h2 className="text-2xl font-bold">{step.title}</h2>
                  </div>
                </div>
                <p className="text-zinc-300 mb-4 leading-relaxed">{step.desc}</p>
                <ul className="space-y-2">
                  {step.details.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                      <svg className="text-emerald-400 mt-1 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center rounded-2xl bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-900 border border-emerald-500/30 p-8">
          <h2 className="text-2xl font-bold mb-2">Prêt à booster votre business ?</h2>
          <p className="text-zinc-400 mb-6">Commandez dès maintenant vos cartes QR DKR TAP.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/#modeles" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400">
              Voir les modèles
            </a>
            <a href="/recharger" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700">
              Recharger mon solde
            </a>
          </div>
        </div>

        {/* Questions ? */}
        <div className="mt-8 text-center text-sm text-zinc-500">
          Des questions ? <Link href="/faq" className="text-emerald-400 hover:underline">Consultez la FAQ</Link> ou <a href={`tel:${BRAND_PHONE.replace(/\s/g, '')}`} className="text-emerald-400 hover:underline">appelez le {BRAND_PHONE}</a>
        </div>
      </main>
    </div>
  )
}
