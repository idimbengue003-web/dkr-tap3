/**
 * Template du sticker physique 10×10 cm (format print 300 DPI = 1181×1181 px).
 *
 * Layout (de haut en bas) :
 *   ┌─────────────────────────────┐
 *   │  TOP (30%)                   │  Logo réseau + texte d'action
 *   │  [LOGO]                      │
 *   │  "Laissez-nous 5 étoiles ! ⭐"
 *   ├─────────────────────────────┤
 *   │  MIDDLE (52%)                │  QR code centré avec marge blanche
 *   │       [QR CODE]              │
 *   ├─────────────────────────────┤
 *   │  BOTTOM (18%)                │  Bande sombre DKR TAP + téléphone
 *   │  [LOGO] DKR TAP — 78 927 12 96
 *   └─────────────────────────────┘
 *
 * Rendu : un SVG unique (1181×1181) qui peut être :
 *   1. Inséré dans le DOM pour le preview du modal (scaling via CSS)
 *   2. Sérialisé → Blob → Image → Canvas → PNG pour le download
 *
 * Le QR code est fourni en entrée (SVG string rendu par qrcode.react)
 * pour rester cohérent avec ce que voit l'admin.
 */

export type Network = 'google' | 'tiktok' | 'instagram' | 'whatsapp' | 'youtube' | 'facebook' | 'snapchat' | null

type NetworkConfig = {
  logoPath: string
  action: string
  /** Couleur d'accent pour le haut du sticker */
  accent: string
  /** Couleur de fond du sticker (gradient) */
  bgGradient?: string
}

export const NETWORKS: Record<Exclude<Network, null>, NetworkConfig> = {
  google: {
    logoPath: '/network-google.svg',
    action: 'Laissez-nous 5 étoiles ! ⭐',
    accent: '#4285F4',
    bgGradient: 'linear-gradient(135deg, #4285F4 0%, #0d47a1 100%)',
  },
  tiktok: {
    logoPath: '/network-tiktok.svg',
    action: 'Abonne-toi pour plus de vidéos ! 🚀',
    accent: '#FE2C55',
    bgGradient: 'linear-gradient(135deg, #000000 0%, #25F4EE 50%, #FE2C55 100%)',
  },
  instagram: {
    logoPath: '/network-instagram.svg',
    action: 'Suivez-nous sur Instagram ! 📸',
    accent: '#d6249f',
    bgGradient: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #d6299f 50%, #833ab4 75%, #515bd4 100%)',
  },
  whatsapp: {
    logoPath: '/network-whatsapp.svg',
    action: 'Contactez-nous directement ! 📲',
    accent: '#25D366',
    bgGradient: 'linear-gradient(135deg, #25D366 0%, #075e54 100%)',
  },
  youtube: {
    logoPath: '/network-youtube.svg',
    action: 'Abonnez-vous à notre chaîne ! ▶️',
    accent: '#FF0000',
    bgGradient: 'linear-gradient(135deg, #FF0000 0%, #cc0000 100%)',
  },
  facebook: {
    logoPath: '/network-facebook.svg',
    action: 'Aimez notre page Facebook ! 👍',
    accent: '#1877F2',
    bgGradient: 'linear-gradient(135deg, #1877F2 0%, #0a42c2 100%)',
  },
  snapchat: {
    logoPath: '/network-snapchat.svg',
    action: 'Ajoutez-nous sur Snapchat ! 👻',
    accent: '#FFFC00',
    bgGradient: 'linear-gradient(135deg, #FFFC00 0%, #f5d800 100%)',
  },
}

/**
 * Détecte le réseau social depuis l'URL cible.
 * Retourne null si l'URL ne correspond à aucun réseau connu.
 */
export function detectNetwork(targetUrl: string | null): Network {
  if (!targetUrl) return null
  const u = targetUrl.toLowerCase()
  if (u.includes('google.') || u.includes('search.google') || u.includes('g.page')) return 'google'
  if (u.includes('tiktok.')) return 'tiktok'
  if (u.includes('instagram.')) return 'instagram'
  if (u.includes('wa.me') || u.includes('whatsapp.')) return 'whatsapp'
  if (u.includes('youtube.') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('facebook.') || u.includes('fb.com')) return 'facebook'
  if (u.includes('snapchat.')) return 'snapchat'
  return null
}

/**
 * Calcule le réseau EFFECTIF à utiliser pour le rendu du sticker.
 *
 * Si le sticker a un `customNetwork` défini ('google' | 'tiktok' | 'instagram' | 'none'),
 * on l'utilise. Sinon, on auto-détecte depuis l'URL cible.
 *
 * @param targetUrl URL cible du sticker (pour auto-détection)
 * @param customNetwork Réseau forcé manuellement par l'admin (null/undefined = auto)
 * @returns Network (null = pas de logo réseau = sticker générique)
 */
export function getEffectiveNetwork(
  targetUrl: string | null,
  customNetwork?: 'google' | 'tiktok' | 'instagram' | 'whatsapp' | 'youtube' | 'facebook' | 'snapchat' | 'none' | null
): Network {
  if (customNetwork === 'none') return null
  if (
    customNetwork === 'google' ||
    customNetwork === 'tiktok' ||
    customNetwork === 'instagram' ||
    customNetwork === 'whatsapp' ||
    customNetwork === 'youtube' ||
    customNetwork === 'facebook' ||
    customNetwork === 'snapchat'
  ) {
    return customNetwork
  }
  return detectNetwork(targetUrl)
}

/**
 * Thème visuel du sticker (couleur de fond + ajustements de couleur).
 * - `white` : fond blanc (défaut), texte noir en haut, bande sombre en bas
 * - `black` : fond noir (dark mode), texte blanc en haut, bande légère en bas
 * - `transparent` : pas de fond, à imprimer sur papier coloré. Texte noir, pas de bande basse
 */
export type StickerTheme = 'white' | 'black' | 'transparent'

/**
 * Génère le SVG complet du sticker 10×10 cm.
 *
 * @param opts.qrSvgString Le SVG (chaîne) du QR code rendu par qrcode.react
 * @param opts.network Le réseau social (null = sticker générique sans logo réseau)
 * @param opts.publicUrl L'URL publique du sticker (affichée en tout petit sous le QR)
 * @param opts.brandName Nom de marque (ex: "DKR TAP")
 * @param opts.brandLogoUrl URL du logo de marque
 * @param opts.brandPhone Téléphone affiché en bas (ex: "78 927 12 96")
 * @param opts.baseUrl Origin du site (ex: "https://dkr-tap3-exzn.vercel.app")
 *   Utilisé pour convertir les chemins relatifs ("/dkrtap-logo.png") en URLs
 *   absolues. INDISPENSABLE quand le SVG est sérialisé en Blob URL pour générer
 *   un PNG — sinon les <image href="/..."> ne se résolvent pas.
 * @param opts.theme Thème visuel : 'white' (défaut) | 'black' | 'transparent'
 */
export function renderStickerSvg(opts: {
  qrSvgString: string
  network: Network
  publicUrl: string
  brandName: string
  brandLogoUrl: string
  brandPhone: string
  baseUrl?: string // ex: "https://dkr-tap3-exzn.vercel.app"
  /** Texte d'action personnalisé — si fourni, remplace le texte par défaut du réseau.
   *  Vide/null → utilise le défaut (NETWORKS[network].action ou "Scannez ce QR code"). */
  customActionText?: string | null
  /** Thème visuel : blanc, noir ou transparent. Défaut : 'white'. */
  theme?: StickerTheme
}): string {
  const { qrSvgString, network, publicUrl, brandName, brandLogoUrl } = opts
  const theme: StickerTheme = opts.theme || 'white'
  const SIZE = 1181 // 10 cm @ 300 DPI
  const net = network ? NETWORKS[network] : null

  // Configuration des couleurs selon le thème
  const colors = {
    white: {
      bg: '<rect width="SIZE" height="SIZE" fill="#ffffff"/>',
      topTextColor: '#0a0a0a',
      separatorColor: '#e4e4e7',
      legendColor: '#71717a',
      bottomBandColor: '#0a0a0a',
      taglineColor: '#a1a1aa',
      phoneColor: '#ffffff',
    },
    black: {
      bg: '<rect width="SIZE" height="SIZE" fill="#0a0a0a"/>',
      topTextColor: '#ffffff',
      separatorColor: '#27272a',
      legendColor: '#a1a1aa',
      bottomBandColor: '#18181b',
      taglineColor: '#71717a',
      phoneColor: '#10b981',
    },
    transparent: {
      bg: '', // Pas de fond — transparent pour impression sur papier coloré
      topTextColor: '#0a0a0a',
      separatorColor: '#71717a',
      legendColor: '#52525b',
      bottomBandColor: '', // Pas de bande — fond transparent partout
      taglineColor: '#52525b',
      phoneColor: '#0a0a0a',
    },
  }[theme]

  // Convertit un chemin relatif ("/foo.svg") en URL absolue si baseUrl est fourni.
  // Les URLs déjà absolues (http://, https://, data:) sont laissées intactes.
  const toAbsoluteUrl = (path: string): string => {
    if (!opts.baseUrl) return path
    if (
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('data:') ||
      path.startsWith('blob:')
    ) {
      return path
    }
    try {
      return new URL(path, opts.baseUrl).toString()
    } catch {
      return path
    }
  }

  // Hauteurs des 3 zones
  const TOP_H = Math.round(SIZE * 0.30) // 354
  const BOTTOM_H = Math.round(SIZE * 0.18) // 213
  const MIDDLE_H = SIZE - TOP_H - BOTTOM_H // 614

  // === TOP : logo réseau + action ===
  const LOGO_SIZE = 140
  const logoX = (SIZE - LOGO_SIZE) / 2
  const logoY = TOP_H / 2 - LOGO_SIZE / 2 - 30

  const actionFontSize = net ? 44 : 36
  // Texte d'action : priorité au custom fourni par l'admin, sinon défaut du réseau
  const defaultActionText = net ? net.action : 'Scannez ce QR code'
  const actionText =
    opts.customActionText && opts.customActionText.trim()
      ? opts.customActionText.trim()
      : defaultActionText
  // Échapper le texte pour XML
  const actionEscaped = escapeXml(actionText)
  const actionY = logoY + LOGO_SIZE + 70

  const topSection = net
    ? `
    <!-- Logo réseau -->
    <image href="${escapeXml(toAbsoluteUrl(net.logoPath))}" x="${logoX}" y="${logoY}" width="${LOGO_SIZE}" height="${LOGO_SIZE}"/>
    <!-- Texte d'action -->
    <text x="${SIZE / 2}" y="${actionY}" text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          font-size="${actionFontSize}" font-weight="700"
          fill="${colors.topTextColor}">${actionEscaped}</text>`
    : `
    <!-- Pas de réseau détecté : logo générique + texte simple -->
    <text x="${SIZE / 2}" y="${logoY + LOGO_SIZE / 2}"
          text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          font-size="${actionFontSize}" font-weight="700"
          fill="${colors.topTextColor}">${actionEscaped}</text>`

  // === MIDDLE : QR code centré ===
  const QR_SIZE = 460
  const qrX = (SIZE - QR_SIZE) / 2
  const qrY = TOP_H + (MIDDLE_H - QR_SIZE) / 2

  // Le QR SVG reçu est potentiellement sans xmlns — on l'ajoute si manquant
  const qrSvgWithXmlns = qrSvgString.includes('xmlns=')
    ? qrSvgString
    : qrSvgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')

  // Embed le QR code en data URL (vectoriel → pas de pixelisation)
  const qrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(qrSvgWithXmlns)}`

  // Petite légende sous le QR (URL publique tronquée)
  const legend = truncateUrl(publicUrl, 42)
  const legendEscaped = escapeXml(legend)
  const legendY = qrY + QR_SIZE + 40

  // === BOTTOM : bande DKR TAP + téléphone ===
  const bottomY = SIZE - BOTTOM_H
  const brandLogoSize = 60
  const brandLogoX = 80
  const brandLogoY = bottomY + (BOTTOM_H - brandLogoSize) / 2

  const brandNameEscaped = escapeXml(brandName)
  const phoneEscaped = escapeXml(opts.brandPhone)
  const taglineEscaped = escapeXml(`Propulsé par ${brandName} — Pour commander le vôtre :`)

  const textX = brandLogoX + brandLogoSize + 30
  const textCenterY = bottomY + BOTTOM_H / 2
  const taglineY = textCenterY - 6
  const phoneY = textCenterY + 36

  // Bande du bas : uniquement pour white et black (pas pour transparent)
  const bottomBand = colors.bottomBandColor
    ? `<rect x="0" y="${bottomY}" width="${SIZE}" height="${BOTTOM_H}" fill="${colors.bottomBandColor}"/>`
    : ''

  // Fond global : uniquement pour white et black
  const bgRect = colors.bg.replace(/SIZE/g, String(SIZE))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <!-- Fond (${theme}) -->
  ${bgRect}

  <!-- TOP : logo réseau + action -->
  ${topSection}

  <!-- Ligne de séparation subtile entre top et middle -->
  <line x1="80" y1="${TOP_H}" x2="${SIZE - 80}" y2="${TOP_H}"
        stroke="${colors.separatorColor}" stroke-width="1"/>

  <!-- MIDDLE : QR code -->
  <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${QR_SIZE}" height="${QR_SIZE}"/>
  <text x="${SIZE / 2}" y="${legendY}" text-anchor="middle"
        font-family="ui-monospace, 'SF Mono', Menlo, monospace"
        font-size="22" fill="${colors.legendColor}">${legendEscaped}</text>

  <!-- BOTTOM : bande ${theme === 'transparent' ? '(transparente)' : 'DKR TAP + téléphone'} -->
  ${bottomBand}
  <image href="${escapeXml(toAbsoluteUrl(brandLogoUrl))}" x="${brandLogoX}" y="${brandLogoY}" width="${brandLogoSize}" height="${brandLogoSize}"/>
  <text x="${textX}" y="${taglineY}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="22" fill="${colors.taglineColor}">${taglineEscaped}</text>
  <text x="${textX}" y="${phoneY}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="34" font-weight="700" fill="${colors.phoneColor}">${phoneEscaped}</text>
</svg>`
}

/* ---------------- Helpers ---------------- */

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncateUrl(url: string, maxLen: number): string {
  if (url.length <= maxLen) return url
  return url.slice(0, maxLen - 1) + '…'
}
