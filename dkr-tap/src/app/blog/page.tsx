import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Calendar, ArrowRight } from 'lucide-react'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '/dkrtap-logo.png'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

export const metadata = {
  title: `Blog — Conseils pour booster votre business | ${BRAND_NAME}`,
  description: "Conseils et astuces pour gagner des abonnés Instagram, des avis Google 5 étoiles et développer votre business au Sénégal avec les cartes QR DKR TAP.",
}

const ARTICLES = [
  {
    slug: 'gagner-avis-google-5-etoiles-dakar',
    title: 'Comment gagner des avis Google 5★ à Dakar en 2025',
    excerpt: "Les avis Google sont devenus le facteur #1 de décision d'achat au Sénégal. Voici comment les multiplier grâce aux cartes QR, sans effort supplémentaire.",
    date: '2025-10-15',
    readTime: '4 min',
    cover: '/dkrtap-logo.png',
  },
  {
    slug: 'augmenter-abonnes-instagram-commercant',
    title: 'Augmenter vos abonnés Instagram : le guide du commerçant sénégalais',
    excerpt: "Instagram est le Google des commerçants au Sénégal. Voici comment passer de 100 à 1000 abonnés en 1 mois, sans acheter de faux abonnés.",
    date: '2025-10-10',
    readTime: '6 min',
    cover: '/network-instagram.svg',
  },
  {
    slug: 'business-tiktok-dakar',
    title: 'TikTok pour business à Dakar : pourquoi ça explose en 2025',
    excerpt: "TikTok est la plateforme qui transforme les petits commerçants dakartois en stars locales. Comment surfer sur la vague avec une carte QR ?",
    date: '2025-10-05',
    readTime: '5 min',
    cover: '/network-tiktok.svg',
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      <Navbar brandName={BRAND_NAME} brandLogo={BRAND_LOGO_URL} brandPhone={BRAND_PHONE} categories={[]} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <p className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2">Blog DKR TAP</p>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">Conseils pour booster votre business</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Astuces, études et guides pour gagner des abonnés, des avis et des clients au Sénégal grâce aux réseaux sociaux.
          </p>
        </div>

        <div className="space-y-6">
          {ARTICLES.map((article) => (
            <article
              key={article.slug}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-emerald-500/50 transition-colors group"
            >
              <Link href={`/blog/${article.slug}`} className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-48 aspect-video sm:aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={article.cover} alt={article.title} className="w-full h-full object-contain" />
                </div>
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(article.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    <span>•</span>
                    <span>{article.readTime} de lecture</span>
                  </div>
                  <h2 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                    {article.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-400 font-semibold">
                    Lire l'article <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
