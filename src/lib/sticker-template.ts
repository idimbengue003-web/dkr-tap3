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

export type Network = 'google' | 'tiktok' | 'instagram' | null

type NetworkConfig = {
  logoPath: string
  action: string
  /** Couleur d'accent optionnelle pour le haut du sticker */
  accent: string
}

export const NETWORKS: Record<Exclude<Network, null>, NetworkConfig> = {
  google: {
    logoPath: '/network-google.svg',
    action: 'Laissez-nous 5 étoiles ! ⭐',
    accent: '#4285F4',
  },
  tiktok: {
    logoPath: '/network-tiktok.svg',
    action: 'Donne de la force, abonne-toi ! 🚀',
    accent: '#FE2C55',
  },
  instagram: {
    logoPath: '/network-instagram.svg',
    action: 'Donne de la force, abonne-toi ! 🚀',
    accent: '#d6249f',
  },
}

/**
 * Détecte le réseau social depuis l'URL cible.
 * Retourne null si l'URL ne correspond à aucun réseau connu.
 */
export function detectNetwork(targetUrl: string | null): Network {
  if (!targetUrl) return null
  const u = targetUrl.toLowerCase()
  if (u.includes('google.') || u.includes('search.google')) return 'google'
  if (u.includes('tiktok.')) return 'tiktok'
  if (u.includes('instagram.')) return 'instagram'
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
  customNetwork?: 'google' | 'tiktok' | 'instagram' | 'none' | null
): Network {
  if (customNetwork === 'none') return null
  if (
    customNetwork === 'google' ||
    customNetwork === 'tiktok' ||
    customNetwork === 'instagram'
  ) {
    return customNetwork
  }
  return detectNetwork(targetUrl)
}

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
 *   Utilisé pour convertir les chemins relatifs ("/scanbridge-logo.svg") en URLs
 *   absolues. INDISPENSABLE quand le SVG est sérialisé en Blob URL pour générer
 *   un PNG — sinon les <image href="/..."> ne se résolvent pas.
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
}): string {
  const { qrSvgString, network, publicUrl, brandName, brandLogoUrl } = opts
  const SIZE = 1181 // 10 cm @ 300 DPI
  const net = network ? NETWORKS[network] : null

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
          fill="#0a0a0a">${actionEscaped}</text>`
    : `
    <!-- Pas de réseau détecté : logo générique + texte simple -->
    <text x="${SIZE / 2}" y="${logoY + LOGO_SIZE / 2}"
          text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          font-size="${actionFontSize}" font-weight="700"
          fill="#0a0a0a">${actionEscaped}</text>`

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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <!-- Fond blanc -->
  <rect width="${SIZE}" height="${SIZE}" fill="#ffffff"/>

  <!-- TOP : logo réseau + action -->
  ${topSection}

  <!-- Ligne de séparation subtile entre top et middle -->
  <line x1="80" y1="${TOP_H}" x2="${SIZE - 80}" y2="${TOP_H}"
        stroke="#e4e4e7" stroke-width="1"/>

  <!-- MIDDLE : QR code -->
  <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${QR_SIZE}" height="${QR_SIZE}"/>
  <text x="${SIZE / 2}" y="${legendY}" text-anchor="middle"
        font-family="ui-monospace, 'SF Mono', Menlo, monospace"
        font-size="22" fill="#71717a">${legendEscaped}</text>

  <!-- BOTTOM : bande sombre DKR TAP + téléphone -->
  <rect x="0" y="${bottomY}" width="${SIZE}" height="${BOTTOM_H}" fill="#0a0a0a"/>
  <image href="${escapeXml(toAbsoluteUrl(brandLogoUrl))}" x="${brandLogoX}" y="${brandLogoY}" width="${brandLogoSize}" height="${brandLogoSize}"/>
  <text x="${textX}" y="${taglineY}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="22" fill="#a1a1aa">${taglineEscaped}</text>
  <text x="${textX}" y="${phoneY}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="34" font-weight="700" fill="#ffffff">${phoneEscaped}</text>
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
