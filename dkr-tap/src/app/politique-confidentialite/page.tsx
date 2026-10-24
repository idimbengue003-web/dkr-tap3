import { Navbar } from '@/components/navbar'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = "/dkrtap-logo.png"
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

export const metadata = {
  title: `Politique de confidentialité | ${BRAND_NAME}`,
  description: "Politique de confidentialité et traitement des données personnelles sur DKR TAP.",
}

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      <Navbar brandName={BRAND_NAME} brandLogo={BRAND_LOGO_URL} brandPhone={BRAND_PHONE} categories={[]} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-zinc-500 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-bold text-white mb-2">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données personnelles est {BRAND_NAME}, basé à Dakar, Sénégal. Contact : {BRAND_PHONE} ou dkrtap@gmail.com.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Données collectées</h2>
          <p>Nous collectons les données suivantes :</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li><strong>Email Google</strong> — pour l'authentification et l'identification du compte</li>
            <li><strong>Nom complet, téléphone, ville, adresse</strong> — pour la livraison des commandes</li>
            <li><strong>Instructions de livraison</strong> — optionnel, pour faciliter la livraison</li>
            <li><strong>Solde wallet</strong> — montant en FCFA disponible sur votre compte</li>
            <li><strong>Historique des commandes</strong> — pour le suivi et la comptabilité</li>
            <li><strong>URLs de redirection configurées</strong> — pour chaque carte QR achetée</li>
            <li><strong>Statistiques de scans</strong> — nombre de fois où chaque carte a été scannée</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. Finalités</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Créer et gérer votre compte</li>
            <li>Traiter et livrer vos commandes de cartes QR</li>
            <li>Gérer votre solde wallet (recharges + paiements)</li>
            <li>Activer les QR codes après paiement</li>
            <li>Vous permettre de configurer les URLs de redirection</li>
            <li>Tenir la comptabilité (factures, historique des paiements)</li>
            <li>Vous contacter en cas de problème avec une commande</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">4. Base légale</h2>
          <p>
            Le traitement de vos données repose sur : (i) votre consentement (connexion Google), (ii) l'exécution du contrat (livraison des commandes), (iii) l'obligation légale de conservation des factures (comptabilité).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">5. Destinataires</h2>
          <p>
            Vos données sont accessibles à : (i) {BRAND_NAME} pour traiter vos commandes, (ii) Vercel Inc. (hébergement), (iii) Upstash (base de données Redis), (iv) Google (authentification), (v) Wave Business (traitement des paiements). Aucune donnée n'est vendue à des tiers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">6. Durée de conservation</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Compte actif : données conservées tant que le compte existe</li>
            <li>Commandes et factures : 10 ans (obligation comptable sénégalaise)</li>
            <li>Données de connexion : 12 mois</li>
            <li>Compte supprimé : suppression effective sous 30 jours (sauf obligations comptables)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">7. Vos droits</h2>
          <p>Vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li><strong>Droit d'accès</strong> — consulter vos données dans /account</li>
            <li><strong>Droit de rectification</strong> — modifier votre profil dans /account</li>
            <li><strong>Droit de suppression</strong> — nous contacter pour supprimer votre compte</li>
            <li><strong>Droit à la portabilité</strong> — recevoir vos données en JSON sur demande</li>
            <li><strong>Droit d'opposition</strong> — refuser certaines utilisations</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez-nous sur {BRAND_PHONE} ou par email.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">8. Sécurité</h2>
          <p>
            Vos données sont stockées sur Vercel KV (Redis managé) avec chiffrement au repos. Les paiements Wave sont traités directement sur l'application Wave — nous ne voyons jamais votre code PIN ni vos données bancaires. L'authentification Google utilise des cookies sécurisés (httpOnly, __Secure- prefix, sameSite=lax, secure=true en HTTPS).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">9. Cookies</h2>
          <p>
            Nous utilisons uniquement des cookies techniques nécessaires : session d'authentification Google (NextAuth), panier d'achat (localStorage), état de l'interface. Aucun cookie publicitaire, marketing ou de tracking commercial. Aucune bannière de consentement n'est requise car nous n'utilisons pas de cookies optionnels.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">10. Transfert hors UE</h2>
          <p>
            Vos données sont hébergées sur Vercel (États-Unis) et Upstash. Ces prestataires sont soumis au RGPD via des Clauses Contractuelles Types (Standard Contractual Clauses). Aucune donnée n'est transférée vers des pays non sécurisés.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">11. Modification</h2>
          <p>
            Cette politique peut être modifiée à tout moment. La date de mise à jour en haut de cette page indique la dernière version.
          </p>
        </section>

        </div>
      </main>
    </div>
  )
}
