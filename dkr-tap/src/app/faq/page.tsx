import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { ChevronDown } from 'lucide-react'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '/dkrtap-logo.png'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

export const metadata = {
  title: `FAQ — Questions fréquentes | ${BRAND_NAME}`,
  description: "Réponses aux questions fréquentes sur les cartes QR DKR TAP : commande, paiement, livraison, configuration du lien de redirection.",
}

const FAQ = [
  {
    cat: 'Commande & paiement',
    items: [
      {
        q: 'Comment commander mes cartes DKR TAP ?',
        a: 'Sélectionnez vos réseaux sociaux (Instagram, TikTok, Google Reviews, etc.) et la quantité dans le panier revendeur. Cliquez "Payer avec mon solde" (si vous avez rechargé) ou "Payer via Wave". La commande est créée immédiatement et vos cartes apparaissent dans votre compte.',
      },
      {
        q: 'Quels sont les moyens de paiement acceptés ?',
        a: 'Wave Sénégal (recharge du solde wallet ou paiement direct). Pas de carte bancaire, pas de PayPal — tout passe par Wave, le plus utilisé au Sénégal. Vous pouvez recharger une fois votre solde (5000, 10000, 20000 FCFA...) puis payer instantanément vos futures commandes sans repasser par Wave.',
      },
      {
        q: 'Comment fonctionne le solde wallet ?',
        a: 'Vous rechargez votre solde sur la page /recharger via Wave. Le paiement est détecté automatiquement en 15-30 secondes par l\'API Wave Business. Votre solde est ensuite immédiatement disponible pour payer vos commandes — plus besoin de Wave à chaque achat. Idéal pour les revendeurs réguliers.',
      },
      {
        q: 'Y a-t-il des remises sur la quantité ?',
        a: 'Oui ! Remise automatique selon le total de cartes dans votre panier : 1-9 cartes = prix normal, 10-19 cartes = -17% de remise, 20+ cartes = -50% de remise. Le Pack Revendeur recommandé (5 Instagram + 2 Snapchat + 3 Facebook + 2 YouTube = 12 cartes) débloque automatiquement la remise de 17%.',
      },
      {
        q: 'Le paiement Wave est-il sécurisé ?',
        a: 'Oui, à 100%. Nous n\'avons jamais accès à votre code PIN Wave. Vous payez sur l\'application officielle Wave, et notre API Wave Business détecte automatiquement le paiement reçu. Aucune donnée bancaire n\'est stockée sur notre site.',
      },
    ],
  },
  {
    cat: 'Livraison',
    items: [
      {
        q: 'Quels sont les délais de livraison ?',
        a: 'Dakar : 24-48h. Pikine, Guédiawaye, Rufisque : 2-3 jours. Thies, Mbour, Saint-Louis : 2-4 jours. Autres villes du Sénégal : 3-5 jours. Livraison par transporteur partenaire ou en main propre selon votre localisation.',
      },
      {
        q: 'Comment sont livrées les cartes ?',
        a: 'Pour Dakar : livraison à domicile par notre équipe ou partenaire de transport. Pour les autres villes : envoi par transporteur (Ndoye Birane, etc.) avec numéro de suivi. Le statut de votre commande (printing → shipped → delivered) est visible dans votre compte.',
      },
      {
        q: 'Les frais de livraison sont-ils inclus ?',
        a: 'La livraison à Dakar est offerte pour toute commande supérieure à 10 cartes. Pour les commandes plus petites, un forfait de 1000 FCFA s\'applique (Dakar) ou 2000 FCFA (banlieue). Hors Dakar : contactez-nous pour un devis.',
      },
      {
        q: 'Puis-je récupérer mes cartes en main propre ?',
        a: 'Oui, c\'est possible ! Appelez-nous au ' + BRAND_PHONE + ' pour organiser un retrait sur place à Dakar. Aucun frais de livraison dans ce cas.',
      },
    ],
  },
  {
    cat: 'Configuration & utilisation',
    items: [
      {
        q: 'Comment modifier le lien de redirection de ma carte QR ?',
        a: 'Connectez-vous sur /account avec Google, allez dans la section "Mes cartes QR", cliquez "Configurer" sur la carte voulue, saisissez l\'URL (ex: https://instagram.com/votre-compte), cliquez "Enregistrer". La modification est immédiate — pas besoin de réimprimer le sticker.',
      },
      {
        q: 'Puis-je modifier le lien autant de fois que je veux ?',
        a: 'Oui, illimité ! Changez l\'URL de redirection autant de fois que nécessaire. Le QR code imprimé ne change pas, mais le lien est modifiable à volonté. C\'est tout l\'intérêt du système DKR TAP — une seule carte, des milliers de redirections possibles.',
      },
      {
        q: 'Quelle URL puis-je mettre comme redirection ?',
        a: 'Toute URL valide commençant par https://. Exemples : votre profil Instagram, une vidéo TikTok, votre page Google Maps pour les avis, votre chaîne YouTube, votre WhatsApp Business, etc. Pour Google Reviews, mettez l\'URL de votre fiche Google Maps.',
      },
      {
        q: 'Le QR code marche-t-il à vie ?',
        a: 'Oui, tant que DKR TAP existe (le domaine www.dkrtap.site reste actif). Aucun expiration. Vous payez une fois, la carte fonctionne pour des années. Si jamais on devait fermer le service, nous vous préviendrons 6 mois à l\'avance.',
      },
      {
        q: 'Mes clients ont-ils besoin d\'une app pour scanner ?',
        a: 'Non, juste l\'appareil photo de leur smartphone. Tous les smartphones modernes (iPhone, Android) scannent les QR codes nativement via l\'appareil photo. Aucune app à installer pour le client final.',
      },
    ],
  },
  {
    cat: 'Compte & sécurité',
    items: [
      {
        q: 'Pourquoi dois-je me connecter avec Google ?',
        a: 'La connexion Google sécurise votre compte (pas de mot de passe à retenir, authentification 2FA automatique via Google). Votre email Google est lié à votre solde wallet, vos commandes et vos cartes QR — pour les retrouver facilement.',
      },
      {
        q: 'Mes données sont-elles protégées ?',
        a: 'Oui. Vos données sont stockées sur Vercel KV (Redis managé) avec chiffrement au repos. Votre mot de passe Google ne nous est jamais transmis. Vos informations de livraison sont utilisées uniquement pour expédier vos cartes. Voir notre Politique de confidentialité pour les détails.',
      },
      {
        q: 'Puis-je supprimer mon compte ?',
        a: 'Oui, contactez-nous sur WhatsApp ou par email, nous supprimerons votre compte et toutes vos données (sauf les commandes déjà facturées, conservées pour la comptabilité).',
      },
    ],
  },
  {
    cat: 'Retours & remboursements',
    items: [
      {
        q: 'Que faire si ma carte QR ne fonctionne pas ?',
        a: 'Si après configuration correcte de l\'URL dans votre compte, le QR ne redirige pas correctement, contactez-nous sous 14 jours. Nous vérifierons le problème et vous renverrons une nouvelle carte gratuitement ou vous rembourserons intégralement.',
      },
      {
        q: 'Puis-je être remboursé si je change d\'avis ?',
        a: 'Si la carte n\'a pas été imprimée/expédiée : remboursement intégral sous 24h. Si la carte a déjà été livrée ET scannée moins de 5 fois : remboursement de 50% (frais d\'impression). Si la carte a été scannée plus de 5 fois : pas de remboursement (preuve que la carte fonctionne).',
      },
      {
        q: 'Comment se passe le remboursement ?',
        a: 'Le remboursement se fait par virement Wave sur votre numéro, sous 7 jours ouvrés. Pour les paiements via solde wallet, le montant est recrédité immédiatement sur votre solde DKR TAP.',
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      <Navbar brandName={BRAND_NAME} brandLogo={BRAND_LOGO_URL} brandPhone={BRAND_PHONE} categories={[]} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">FAQ</h1>
          <p className="text-lg text-zinc-400">
            Questions fréquentes sur les cartes QR {BRAND_NAME}
          </p>
        </div>

        <div className="space-y-12">
          {FAQ.map((section) => (
            <section key={section.cat}>
              <h2 className="text-xl font-bold text-emerald-400 mb-4 border-l-4 border-emerald-500 pl-3">
                {section.cat}
              </h2>
              <div className="space-y-3">
                {section.items.map((item, i) => (
                  <details key={i} className="group rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                    <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors list-none">
                      <span className="font-semibold text-sm sm:text-base">{item.q}</span>
                      <ChevronDown size={18} className="text-zinc-500 group-open:rotate-180 transition-transform shrink-0" />
                    </summary>
                    <div className="px-4 pb-4 text-sm text-zinc-400 leading-relaxed">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-900 border border-emerald-500/30">
          <h2 className="text-xl font-bold mb-2">Vous ne trouvez pas votre réponse ?</h2>
          <p className="text-zinc-400 text-sm mb-4">Contactez-nous directement, on vous répond vite.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={`tel:${BRAND_PHONE.replace(/\s/g, '')}`} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 text-sm">
              Appeler le {BRAND_PHONE}
            </a>
            <Link href="/comment-ca-marche" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 text-white font-semibold hover:bg-zinc-700 text-sm">
              Comment ça marche ?
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
