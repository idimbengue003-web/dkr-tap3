import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Calendar, ArrowLeft, ArrowRight } from 'lucide-react'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = "/dkrtap-logo.png"
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

const ARTICLES: Record<string, { title: string; date: string; readTime: string; cover: string; content: string }> = {
  'gagner-avis-google-5-etoiles-dakar': {
    title: 'Comment gagner des avis Google 5★ à Dakar en 2025',
    date: '2025-10-15',
    readTime: '4 min',
    cover: '/network-google.svg',
    content: `
## Pourquoi les avis Google sont cruciaux au Sénégal

En 2025, **85% des consommateurs sénégalais** consultent les avis Google avant d'aller dans un commerce (restaurant, boutique, salon). C'est devenu le premier facteur de décision, devant le bouche-à-oreille traditionnel.

Pourtant, la plupart des commerçants ont moins de 10 avis Google, souvent anciens. Pourquoi ? Parce que demander un avis, c'est compliqué : il faut le numéro de téléphone, ouvrir Google Maps, trouver la fiche, écrire l'avis... 

## La solution : la carte QR Google Reviews

Avec une carte DKR TAP placée sur votre comptoir, vos clients n'ont qu'à scanner le QR code avec leur smartphone pour être directement redirigés vers votre page Google Maps. **1 scan = 1 avis potentiel.**

## 5 conseils pour multiplier vos avis

### 1. Placez la carte à un endroit stratégique
- **Comptoir de caisse** — le client attend son ticket, il scrolle, il scanne
- **Table de restaurant** — en attendant l'addition
- **Sac de livraison** — pour les commandes à emporter
- **Miroir de salon** — pendant que le client se fait coiffer

### 2. Demandez-le verbalement
"Si l'expérience vous a plu, n'hésitez pas à scanner et laisser un avis sur Google, ça nous aide énormément". Cette simple phrase augmente le taux de conversion de 60%.

### 3. Répondez à chaque avis
Les clients sont 2× plus enclins à laisser un avis s'ils voient que vous répondez. Prenez 5 min par jour pour répondre (même les avis négatifs, avec tact).

### 4. Offrez un petit bonus
"Scannez et laissez un avis pour recevoir 5% sur votre prochaine commande". Légal, efficace, et ça coûte moins cher qu'une campagne Google Ads.

### 5. Suivez vos statistiques
Avec DKR TAP, vous voyez le nombre de scans par jour. Si 50 personnes scannent votre carte Google Reviews cette semaine, vous devriez avoir au moins 15 avis. Si 0 avis sur 50 scans, il y a un problème (mauvaise URL, page Google Maps non trouvée, etc.).

## Conclusion

Une carte DKR TAP Google Reviews coûte 3 000 FCFA. Si elle vous génère 30 avis en 1 mois, c'est le meilleur ROI marketing de votre business. Bien plus efficace qu'une campagne Facebook Ads à 50 000 FCFA.

Prêt à booster vos avis Google ? [Commandez votre carte](/#modeles) dès maintenant.
    `,
  },
  'augmenter-abonnes-instagram-commercant': {
    title: 'Augmenter vos abonnés Instagram : le guide du commerçant sénégalais',
    date: '2025-10-10',
    readTime: '6 min',
    cover: '/network-instagram.svg',
    content: `
## Pourquoi Instagram est devenu le Google des commerces sénégalais

Au Sénégal, **Instagram dépasse Google** pour la recherche de boutiques de mode, salons, restaurants. Les consommateurs regardent les photos, le nombre d'abonnés, les avis... Un compte avec 2 000 abonnés inspire confiance. Un compte avec 50 abonnés fait fuir.

Mais comment passer de 50 à 2000 abonnés sans acheter de faux abonnés (interdit par Instagram, et ça détruit votre reach) ?

## La méthode DKR TAP pour gagner des abonnés authentiques

### Étape 1 : La carte QR Instagram sur place
Achetez 5 cartes DKR TAP Instagram à 3 000 FCFA chacune. Placez-les :
- 1 sur le comptoir
- 1 sur le miroir (salon) ou la table (resto)
- 1 sur le sac de livraison
- 1 sur la vitrine
- 1 à donner aux amis proches

Chaque scan redirige vers votre profil Instagram — **1 scan = 1 abonné potentiel**.

### Étape 2 : Le contenu de base
3 posts par semaine minimum :
- **Lundi** : photo du produit/before-after
- **Mercredi** : vidéo de 15s (Reels) — le client qui paie, le produit en action
- **Vendredi** : coulisses (livraison, atelier)

### Étape 3 : Les hashtags géolocalisés
Sur chaque post, ajoutez : #dakar #senegal #commerce #votre-quartier (ex: #medina, #plateau, #pikine). Ça multiplie le reach par 5.

### Étape 4 : Les Stories quotidiennes
1 Story par jour minimum. Les Stories boostent l'engagement + maintiennent votre compte actif aux yeux de l'algorithme.

### Étape 5 : Suivez les statistiques
Avec DKR TAP, vous voyez combien de scans votre carte Instagram génère. Objectif : 50 scans/semaine = 10-15 abonnés/semaine. En 6 mois, vous passez de 50 à 500+ abonnés 100% authentiques.

## Erreurs à éviter

❌ **Acheter des abonnements** — Instagram détecte et bannit
❌ **Faire des follow-for-follow** — taux d'engagement en chute
❌ **Poster 1 fois par mois** — l'algorithme oublie votre compte
❌ **Hashtags génériques uniquement** (#love, #instagood) — noyé dans la masse
❌ **Pas de Stories** — vous ratez 70% du reach

## Conclusion

La croissance Instagram n'est pas magique, mais elle peut être **systématique**. Carte DKR TAP + 3 posts/semaine + 1 Story/jour = croissance assurée. Investissement total : 15 000 FCFA (5 cartes) + 30 min/jour de contenu.

Prêt à démarrer ? [Commandez vos 5 cartes Instagram](/#modeles) et commencez dès aujourd'hui.
    `,
  },
  'business-tiktok-dakar': {
    title: 'TikTok pour business à Dakar : pourquoi ça explose en 2025',
    date: '2025-10-05',
    readTime: '5 min',
    cover: '/network-tiktok.svg',
    content: `
## TikTok = le réseau social #1 des 18-35 ans au Sénégal

Avec plus de 3 millions d'utilisateurs actifs au Sénégal, TikTok a dépassé Facebook chez les jeunes adultes dakartois. Et contrairement à Instagram où il faut un gros compte pour percer, TikTok offre une **portée organique exceptionnelle** aux nouveaux créateurs.

Un commerçant peut avoir 50 abonnés et faire une vidéo vue 50 000 fois. C'est impensable sur Instagram.

## Pourquoi vos clients sont sur TikTok

- Ils cherchent des **reviews** de boutiques
- Ils découvrent des **nouveaux produits** via le feed
- Ils suivent des **tendances locales** (def debbo, mode sénégalaise, etc.)
- Ils achètent directement via les liens en bio

## Le combo gagnant : Carte DKR TAP + TikTok

1. **Sur place** : vos clients scannent la carte DKR TAP → suivent votre compte TikTok instantanément
2. **À distance** : vos followers TikTok voient vos vidéos → viennent en boutique → scannent la carte → deviennent abonnés
3. **Boucle vertueuse** : + d'abonnés → + de reach → + de clients physiques → + de scans → + d'abonnés

## 3 idées de vidéos TikTok pour commerçants dakartois

### 1. "Une journée dans ma boutique" (POV)
Filmez votre journée du matin au soir, en accéléré. Format 60s. Histoire : le réveil, l'ouverture, les premiers clients, les coulisses, la fermeture. Très populaire au Sénégal car ça donne un aperçu authentique.

### 2. "Avant / Après" produit
Pour les salons, boutiques de mode, restaurants : montrez la transformation. 15s suffisent. Très partageable, génère des commentaires.

### 3. "Tuto express"
- Salon : "Comment je tresse les cheveux en 30s"
- Resto : "La vraie recette du thiéboudienne en 1 min"
- Boutique : "Comment je choisis mes tissus au marché"

## Stats à suivre

Avec DKR TAP, vous voyez le nombre de scans de votre carte TikTok :
- 50 scans/semaine = objectif minimal
- 200 scans/semaine = excellent (équivalent à 100-200 nouveaux abonnés)
- 500+ scans/semaine = viral (lancez une campagne payante pour capitaliser)

## Conclusion

TikTok 2025 = Facebook 2015. Les commerçants qui investissent maintenant vont capturer le marché. Une carte DKR TAP TikTok coûte 3 000 FCFA. Avec 5 cartes placées stratégiquement + 1 vidéo/semaine, vous pouvez passer de 0 à 500 abonnés en 2 mois.

[Commandez vos cartes TikTok DKR TAP](/#modeles) et profitez de la vague.
    `,
  },
}

export function generateStaticParams() {
  return Object.keys(ARTICLES).map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return (async () => {
    const { slug } = await params
    const article = ARTICLES[slug]
    if (!article) return { title: 'Article introuvable' }
    return {
      title: `${article.title} | ${BRAND_NAME} Blog`,
      description: article.content.split('\n')[0].replace(/^#\s*/, '').slice(0, 150),
    }
  })()
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = ARTICLES[slug]
  if (!article) notFound()

  // Convertir le markdown simple en HTML (très basique, sans dépendance externe)
  const htmlContent = article.content
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) return `<h2 class="text-xl font-bold text-white mt-6 mb-3">${line.slice(3)}</h2>`
      if (line.startsWith('### ')) return `<h3 class="text-lg font-semibold text-white mt-5 mb-2">${line.slice(4)}</h3>`
      if (line.startsWith('- ')) return `<li class="ml-6 text-zinc-300">${line.slice(2)}</li>`
      if (line.startsWith('❌ ')) return `<p class="text-red-400 ml-4">${line.slice(2)}</p>`
      if (line.startsWith('✅ ')) return `<p class="text-emerald-400 ml-4">${line.slice(2)}</p>`
      if (line.trim() === '') return '<br />'
      // Convertir les liens markdown [text](url)
      const linkified = line.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-emerald-400 hover:underline">$1</a>'
      )
      return `<p class="text-zinc-300 mb-3 leading-relaxed">${linkified}</p>`
    })
    .join('')

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      <Navbar brandName={BRAND_NAME} brandLogo={BRAND_LOGO_URL} brandPhone={BRAND_PHONE} categories={[]} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">
        <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-6">
          <ArrowLeft size={16} /> Retour au blog
        </Link>

        <article>
          <div className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden mb-6 flex items-center justify-center">
            <img src={article.cover} alt={article.title} className="w-full h-full object-contain" />
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {new Date(article.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            <span>•</span>
            <span>{article.readTime} de lecture</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold mb-6">{article.title}</h1>

          <div
            className="prose prose-invert max-w-none text-zinc-300 text-base leading-relaxed [&_li]:list-disc [&_h2]:font-bold [&_h3]:font-semibold [&_a]:text-emerald-400"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* CTA */}
          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-900 border border-emerald-500/30 text-center">
            <h2 className="text-xl font-bold mb-2">Prêt à booster votre business ?</h2>
            <p className="text-zinc-400 text-sm mb-4">Commandez vos cartes QR DKR TAP dès maintenant.</p>
            <Link href="/#modeles" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400">
              Voir les modèles <ArrowRight size={16} />
            </Link>
          </div>
        </article>
      </main>
    </div>
  )
}
