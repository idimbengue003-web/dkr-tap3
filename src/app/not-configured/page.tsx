import Link from 'next/link'

export const dynamic = 'force-dynamic'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'ScanBridge'
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '/scanbridge-logo.svg'

export default function NotConfiguredPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  return searchParams instanceof Promise
    ? searchParams.then((p) => render(p.slug))
    : render((searchParams as { slug?: string })?.slug)
}

function render(slug?: string) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-zinc-200">
        {/* Logo de marque */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center p-2.5 mb-4">
          <img
            src={BRAND_LOGO_URL}
            alt={`Logo ${BRAND_NAME}`}
            width={40}
            height={40}
            className="w-full h-full"
          />
        </div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {BRAND_NAME}
        </div>
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-600"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">
          Ce lien n&apos;est pas encore configuré
        </h1>
        <p className="text-zinc-600 mb-6">
          Le sticker{slug ? <> <code className="px-1.5 py-0.5 bg-zinc-100 rounded text-sm font-mono">{slug}</code></> : ''} n&apos;a pas d&apos;URL de redirection pour le moment. Revenez plus tard ou contactez l&apos;administrateur.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
