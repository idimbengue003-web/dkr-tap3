import { Navbar } from '@/components/navbar'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '/dkrtap-logo.png'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

export const metadata = {
  title: `Mentions légales | ${BRAND_NAME}`,
  description: "Mentions légales du site DKR TAP — éditeur, hébergeur, propriété intellectuelle.",
}

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      <Navbar brandName={BRAND_NAME} brandLogo={BRAND_LOGO_URL} brandPhone={BRAND_PHONE} categories={[]} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Mentions légales</h1>
        <p className="text-sm text-zinc-500 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

        <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-bold text-white mb-2">1. Éditeur du site</h2>
          <p>
            Le site www.dkrtap.site est édité par :<br />
            <strong>{BRAND_NAME}</strong><br />
            Statut : Auto-entrepreneur<br />
            NINE : à compléter après inscription sur guichetunique.sn<br />
            Téléphone : {BRAND_PHONE}<br />
            Email : {BRAND_PHONE.replace(/\s/g, '')}@gmail.com (à personnaliser)<br />
            Adresse : Dakar, Sénégal
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Directeur de la publication</h2>
          <p>
            Le Directeur de la publication est le responsable de {BRAND_NAME}. Pour toute question relative au contenu du site, contactez-nous via le formulaire de contact ou par téléphone au {BRAND_PHONE}.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. Hébergement</h2>
          <p>
            Le site est hébergé par :<br />
            <strong>Vercel Inc.</strong><br />
            340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis<br />
            Site web : https://vercel.com<br />
            Email : privacy@vercel.com
          </p>
          <p className="mt-2">
            La base de données (Redis managé) est hébergée par :<br />
            <strong>Upstash</strong><br />
            Site web : https://upstash.com
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">4. Propriété intellectuelle</h2>
          <p>
            L'ensemble des contenus présents sur ce site (textes, images, logos, design, code) est la propriété de {BRAND_NAME}, sauf mention contraire. Toute reproduction, représentation, modification ou adaptation, totale ou partielle, sans autorisation écrite préalable est interdite et pourra être poursuivie conformément aux dispositions légales en vigueur.
          </p>
          <p className="mt-2">
            Les logos et marques des réseaux sociaux mentionnés (Instagram, TikTok, Google, WhatsApp, YouTube, Facebook, Snapchat) appartiennent à leurs propriétaires respectifs. {BRAND_NAME} n'est pas affilié à ces marques.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">5. Données personnelles</h2>
          <p>
            Le traitement des données personnelles est décrit dans notre <a href="/politique-confidentialite" className="text-emerald-400 hover:underline">Politique de confidentialité</a>. Le Client dispose d'un droit d'accès, de rectification et de suppression de ses données.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">6. Cookies</h2>
          <p>
            Le site utilise des cookies techniques nécessaires au fonctionnement (session d'authentification Google, panier d'achat). Aucun cookie publicitaire ou de tracking commercial n'est utilisé. La conservation de ces cookies est nécessaire pour utiliser les fonctionnalités du site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">7. Limitation de responsabilité</h2>
          <p>
            {BRAND_NAME} s'efforce de maintenir le site accessible 24h/24, mais ne peut garantir une disponibilité absolue. En cas d'indisponibilité, le Vendeur s'engage à rétablir l'accès dans les meilleurs délais. {BRAND_NAME} ne saurait être tenu responsable des dommages indirects (perte de chiffre d'affaires, perte de données) liés à l'utilisation du site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">8. Liens hypertextes</h2>
          <p>
            Le site peut contenir des liens vers des sites externes. {BRAND_NAME} n'est pas responsable du contenu de ces sites.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">9. Contact</h2>
          <p>
            Pour toute question relative aux mentions légales : {BRAND_PHONE.replace(/\s/g, '')}@gmail.com (à personnaliser) ou {BRAND_PHONE}.
          </p>
        </section>

        </div>
      </main>
    </div>
  )
}
