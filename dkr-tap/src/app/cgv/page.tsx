import { Navbar } from '@/components/navbar'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = "/dkrtap-logo.png"
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

export const metadata = {
  title: `CGV — Conditions Générales de Vente | ${BRAND_NAME}`,
  description: "Conditions générales de vente de DKR TAP — cartes QR pour réseaux sociaux.",
}

export default function CGVPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      <Navbar brandName={BRAND_NAME} brandLogo={BRAND_LOGO_URL} brandPhone={BRAND_PHONE} categories={[]} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Conditions Générales de Vente</h1>
        <p className="text-sm text-zinc-500 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="prose prose-invert max-w-none space-y-6 text-zinc-300 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Article 1 — Objet</h2>
          <p>
            Les présentes Conditions Générales de Vente (CGV) régissent les relations entre {BRAND_NAME} (ci-après "le Vendeur") et tout client (ci-après "le Client") qui commande des cartes QR via le site www.dkrtap.site. Le Vendeur commercialise des stickers/cartes QR physiques (10×10 cm) qui, une fois scannés, redirigent vers une URL configurable par le Client.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Article 2 — Produits et prix</h2>
          <p>
            Les cartes sont vendues au prix unitaire affiché sur le site www.dkrtap.site/#tarifs au moment de la commande. Des remises dégressives s'appliquent automatiquement :
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>1 à 9 cartes : prix unitaire normal</li>
            <li>10 à 19 cartes : remise de 17% (soit ~2 500 FCFA/carte)</li>
            <li>20 cartes et plus : remise de 50% (soit ~1 500 FCFA/carte)</li>
          </ul>
          <p className="mt-2">
            Le prix de base est de 3 000 FCFA par carte. Les prix sont indiqués en FCFA (Francs CFA), taxes incluses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Article 3 — Commande et paiement</h2>
          <p>
            Le Client commande via le panier revendeur sur le site. Le paiement s'effectue via Wave Sénégal :
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Paiement direct Wave (montant exact, détection automatique en 15-30s)</li>
            <li>OU paiement via solde wallet pré-rechargé (instantané)</li>
          </ul>
          <p className="mt-2">
            La commande est validée dès réception du paiement. Les cartes QR sont créées immédiatement et visibles dans le compte du Client (status "pending" → "paid").
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Article 4 — Livraison</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Dakar : 24-48h (livraison offerte dès 10 cartes commandées, sinon 1000 FCFA)</li>
            <li>Banlieue (Pikine, Guédiawaye, Rufisque) : 2-3 jours (2000 FCFA)</li>
            <li>Autres villes du Sénégal : 3-5 jours (devis sur demande)</li>
          </ul>
          <p className="mt-2">
            Le Client peut organiser un retrait sur place à Dakar (sans frais) en appelant le {BRAND_PHONE}. Le statut de la commande (printing → shipped → delivered) est visible dans le compte.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Article 5 — Configuration du lien de redirection</h2>
          <p>
            Le Client peut configurer le lien de redirection de chaque carte QR depuis son compte (/account) à tout moment et de manière illimitée. Le QR code imprimé ne change pas, mais l'URL est modifiable. Le Client est responsable de la validité de l'URL fournie.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Article 6 — Droit de rétractation et remboursement</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Carte non imprimée/non expédiée :</strong> remboursement intégral sous 24h.</li>
            <li><strong>Carte livrée ET scannée moins de 5 fois :</strong> remboursement de 50% (frais d'impression à la charge du Vendeur).</li>
            <li><strong>Carte scannée plus de 5 fois :</strong> pas de remboursement (preuve que la carte fonctionne).</li>
            <li><strong>Carte défectueuse/non fonctionnelle après configuration correcte :</strong> échange gratuit ou remboursement intégral sous 14 jours.</li>
          </ul>
          <p className="mt-2">
            Les remboursements se font par virement Wave sur le numéro du Client, sous 7 jours ouvrés. Pour les paiements via solde wallet, le montant est recrédité immédiatement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Article 7 — Garantie</h2>
          <p>
            Le Vendeur garantit que le QR code imprimé redirigera correctement vers l'URL configurée par le Client, tant que le site www.dkrtap.site reste en activité. En cas d'indisponibilité prolongée du service, le Vendeur préviendra les Clients 6 mois à l'avance pour leur permettre d'utiliser d'autres QR codes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Article 8 — Données personnelles</h2>
          <p>
            Le Vendeur collecte les données du Client (email Google, nom, téléphone, adresse de livraison) uniquement pour traiter les commandes. Voir la <a href="/politique-confidentialite" className="text-emerald-400 hover:underline">Politique de confidentialité</a> pour les détails.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Article 9 — Droit applicable</h2>
          <p>
            Les présentes CGV sont soumises au droit sénégalais. En cas de litige, les parties s'efforceront de trouver une solution amiable avant toute action judiciaire. À défaut, les tribunaux sénégalais seront compétents.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Contact</h2>
          <p>
            {BRAND_NAME}<br />
            Email : dkrtap@gmail.com<br />
            Téléphone : {BRAND_PHONE}<br />
            Dakar, Sénégal
          </p>
        </section>

        </div>
      </main>
    </div>
  )
}
