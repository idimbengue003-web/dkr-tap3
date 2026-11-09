'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { QrCode, Check, Loader2, ExternalLink, Copy } from 'lucide-react'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_LOGO_URL = "/dkrtap-logo.png"
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'

// Guides pour trouver l'URL selon le réseau
const URL_GUIDES = [
  {
    network: 'Instagram',
    icon: '📷',
    color: '#d6299f',
    guide: 'Allez sur instagram.com → connectez-vous → allez sur votre profil → copiez l\'URL dans la barre d\'adresse.',
    example: 'https://instagram.com/votre_compte',
  },
  {
    network: 'TikTok',
    icon: '🎵',
    color: '#FE2C55',
    guide: 'Allez sur tiktok.com → connectez-vous → cliquez sur votre profil → copiez l\'URL.',
    example: 'https://tiktok.com/@votre_compte',
  },
  {
    network: 'Google Reviews',
    icon: '⭐',
    color: '#4285F4',
    guide: 'Allez sur Google Maps → cherchez votre commerce → cliquez sur "Laisser un avis" → copiez l\'URL de la page.',
    example: 'https://g.page/r/VotreFicheGoogle',
  },
  {
    network: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
    guide: 'Format : https://wa.me/221XXXXXXXXX (remplacez X par votre numéro sans espaces).',
    example: 'https://wa.me/221789271296',
  },
  {
    network: 'Facebook',
    icon: '👥',
    color: '#1877F2',
    guide: 'Allez sur facebook.com → votre page professionnelle → copiez l\'URL dans la barre d\'adresse.',
    example: 'https://facebook.com/votre-page',
  },
  {
    network: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    guide: 'Allez sur youtube.com → votre chaîne → copiez l\'URL dans la barre d\'adresse.',
    example: 'https://youtube.com/@votre-chaine',
  },
  {
    network: 'Snapchat',
    icon: '👻',
    color: '#FFFC00',
    guide: 'Allez sur snapchat.com → ajoutez votre snapcode ou profile URL.',
    example: 'https://snapchat.com/add/votre-compte',
  },
]

export default function ConfigurePage() {
  const params = useParams()
  const slug = params.slug as string

  const [loading, setLoading] = useState(true)
  const [sticker, setSticker] = useState<any>(null)
  const [error, setError] = useState('')
  const [url, setUrl] = useState('')
  // URL finale effectivement sauvegardée (avec https:// ajouté si besoin).
  // Utilisée par l'écran de succès pour le lien "Tester" — sinon le bouton
  // pointerait vers une URL relative (404 sur le domaine courant).
  const [savedUrl, setSavedUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [urlError, setUrlError] = useState('')
  // Si la carte est déjà configurée, on lance la redirection vers l'URL cible.
  // Pendant ce court délai, on reste sur l'écran de chargement pour éviter
  // de flasher le formulaire en dessous de la redirection.
  const [redirecting, setRedirecting] = useState(false)
  // Mode template : si le sticker scanné est un template, la soumission crée
  // un NOUVEAU sticker au lieu de modifier le template. On garde le slug du
  // nouveau sticker pour l'afficher dans l'écran de succès.
  const [isTemplate, setIsTemplate] = useState(false)
  const [newStickerSlug, setNewStickerSlug] = useState('')

  // Charger les infos du sticker
  useEffect(() => {
    fetch(`/api/stickers/by-slug/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Carte introuvable')
        return res.json()
      })
      .then((data) => {
        // Si le sticker est un template, on NE redirige pas même s'il a une
        // URL (un template ne devrait pas en avoir, mais par sécurité).
        // On affiche toujours la page configure.
        if (data.isTemplate) {
          setIsTemplate(true)
          setSticker(data)
          setLoading(false)
          return
        }
        if (data.targetUrl) {
          // Rediriger vers l'URL cible — on reste en mode "redirecting"
          // pour ne pas afficher le formulaire pendant la redirection.
          setRedirecting(true)
          window.location.href = data.targetUrl
          return
        }
        setSticker(data)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [slug])

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setUrlError('Veuillez saisir une URL')
      return false
    }
    try {
      const u = new URL(value.trim())
      if (!u.protocol.startsWith('http')) {
        setUrlError('L\'URL doit commencer par http:// ou https://')
        return false
      }
      setUrlError('')
      return true
    } catch {
      // Essayer avec https://
      try {
        new URL(`https://${value.trim()}`)
        setUrlError('')
        return true
      } catch {
        setUrlError('URL invalide. Exemple : https://instagram.com/votre_compte')
        return false
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let finalUrl = url.trim()
    // Si pas de protocole, ajouter https://
    if (finalUrl && !finalUrl.match(/^https?:\/\//)) {
      finalUrl = `https://${finalUrl}`
    }
    if (!validateUrl(finalUrl)) return

    setSaving(true)
    try {
      const res = await fetch(`/api/stickers/by-slug/${slug}/redirect-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: finalUrl }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Échec de la sauvegarde')
      }
      const data = await res.json()
      // On mémorise l'URL finale (avec https://) pour l'écran de succès.
      // Sinon le bouton "Tester le lien" pointerait vers une URL relative.
      setSavedUrl(finalUrl)
      setUrl(finalUrl) // synchronise aussi l'affichage
      // Si l'API a créé un nouveau sticker (mode template), on récupère son slug
      // pour l'afficher dans l'écran de succès.
      if (data.templateMode && data.slug) {
        setNewStickerSlug(data.slug)
      }
      setSaved(true)
    } catch (e) {
      setUrlError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-2xl font-bold mb-2">Carte introuvable</p>
          <p className="text-zinc-400 mb-4">Cette carte QR n'existe pas ou a été désactivée.</p>
          <a href="/" className="text-emerald-400 hover:underline">Retour à l'accueil</a>
        </div>
      </div>
    )
  }

  if (saved) {
    // Mode template : un nouveau sticker a été créé dans l'admin avec l'URL
    // du client. Le sticker physique scanné reste un template "ouvert".
    if (isTemplate) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check size={40} className="text-black" />
            </div>
            <h1 className="text-3xl font-bold mb-3">C'est enregistré ! 🎉</h1>
            <p className="text-zinc-400 mb-2">Votre lien a bien été transmis.</p>
            <p className="text-zinc-500 text-sm mb-6">
              Vous pouvez tester votre lien ci-dessous :
            </p>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 mb-6">
              <p className="text-emerald-400 text-sm break-all">{savedUrl}</p>
            </div>
            <a
              href={savedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
            >
              <ExternalLink size={18} />
              Tester le lien
            </a>
            {newStickerSlug && (
              <p className="text-xs text-zinc-600 mt-6">
                Référence sticker : <code className="text-zinc-400">{newStickerSlug}</code>
              </p>
            )}
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check size={40} className="text-black" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Carte configurée ! 🎉</h1>
          <p className="text-zinc-400 mb-2">Votre carte QR est maintenant active.</p>
          <p className="text-zinc-500 text-sm mb-6">
            Quand quelqu'un scanne votre carte, il sera redirigé vers :
          </p>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 mb-6">
            <p className="text-emerald-400 text-sm break-all">{savedUrl}</p>
          </div>
          <a
            href={savedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
          >
            <ExternalLink size={18} />
            Tester le lien
          </a>
          <p className="text-xs text-zinc-600 mt-6">
            Pour modifier ce lien plus tard, connectez-vous sur{' '}
            <a href="/account" className="text-emerald-400 hover:underline">dkrtap.site/account</a>
            {' '}avec votre compte Google.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <img src={BRAND_LOGO_URL} alt={BRAND_NAME} width={32} height={32} className="rounded-lg" />
          <span className="font-bold text-lg">{BRAND_NAME}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Intro */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <QrCode size={28} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Configurez votre carte QR
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
            C'est la première fois que vous utilisez cette carte. Choisissez le lien vers lequel vos clients seront redirigés quand ils scannent le QR code.
          </p>
        </div>

        {/* Carte info */}
        {sticker && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
              <QrCode size={20} className="text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{sticker.label || 'Carte QR DKR TAP'}</p>
              <p className="text-xs text-zinc-500 font-mono truncate">#{slug}</p>
            </div>
            {isTemplate && (
              <span className="text-[11px] text-emerald-400/80 shrink-0">auto</span>
            )}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <label htmlFor="target-url" className="text-sm font-medium mb-2 block">
              Votre lien de redirection
            </label>
            <input
              id="target-url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (urlError) setUrlError('')
              }}
              placeholder="https://instagram.com/votre_compte"
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              autoFocus
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
            />
            {urlError && <p className="text-xs text-red-400 mt-1">{urlError}</p>}
            <p className="text-xs text-zinc-500 mt-1.5">
              Collez l'URL complète vers laquelle vos clients doivent être redirigés. Le <code className="text-zinc-400">https://</code> est ajouté automatiquement si vous l'oubliez.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !url.trim()}
            className="w-full py-3.5 rounded-xl bg-emerald-500 text-black font-semibold text-base hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 size={18} className="animate-spin" /> Configuration…</>
            ) : (
              <><Check size={18} /> Activer ma carte</>
            )}
          </button>
        </form>

        {/* Guides par réseau */}
        <div className="space-y-2">
          <p className="text-sm text-zinc-500 mb-2">
            Comment trouver votre URL ?
          </p>
          {URL_GUIDES.map((g) => (
            <details key={g.network} className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <summary className="flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-800/50 list-none">
                <span className="text-lg shrink-0">{g.icon}</span>
                <span className="font-medium text-sm">{g.network}</span>
                <span className="ml-auto text-xs text-zinc-600">Voir</span>
              </summary>
              <div className="px-3 pb-3 pt-1">
                <p className="text-sm text-zinc-400 leading-relaxed mb-2">{g.guide}</p>
                <div className="flex items-center gap-2 rounded-lg bg-zinc-950 p-2">
                  <code className="text-xs text-emerald-400 flex-1 break-all">{g.example}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(g.example)}
                    className="text-zinc-500 hover:text-white shrink-0"
                    title="Copier"
                    aria-label={`Copier l'exemple ${g.network}`}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>

        {/* Note */}
        <div className="mt-8 text-center text-xs text-zinc-600 space-y-1">
          <p>
            Cette page n'apparaît que la première fois que vous scannez votre carte.
          </p>
          <p>
            Pour modifier ce lien plus tard :{' '}
            <a href="/account" className="text-emerald-400 hover:underline">dkrtap.site/account</a>
            {' · '}
            <a href={`tel:${BRAND_PHONE.replace(/\s/g, '')}`} className="text-emerald-400 hover:underline">{BRAND_PHONE}</a>
          </p>
        </div>
      </main>
    </div>
  )
}
