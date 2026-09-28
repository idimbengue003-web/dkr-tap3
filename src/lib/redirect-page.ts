/**
 * Génère le HTML d'une page d'attente professionnelle pour la passerelle QR.
 *
 * Deux cas de figure :
 *   1. Sticker configuré  → "Connexion sécurisée... Redirection vers la page du commerçant."
 *      Auto-redirect après REDIRECT_DELAY_MS via <meta http-equiv="refresh"> + JS.
 *   2. Sticker non configuré ou inactif → page d'attente avec message explicatif,
 *      aucun redirect automatique.
 *
 * Le HTML est rendu côté serveur (pas de React hydration) pour rester léger
 * (< 5 KB) et instantané sur réseau mobile.
 *
 * IMPORTANT : toutes les valeurs dynamiques (targetUrl, companyName, slug)
 * sont échappées pour HTML + JS via escapeHtml() pour éviter les attaques XSS.
 */

const REDIRECT_DELAY_MS = 600 // délai avant auto-redirect (suffisamment court pour ne pas frustrer, assez long pour lire le message)

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeJs(str: string): string {
  return JSON.stringify(str)
}

function getBrandName(): string {
  return (
    process.env.NEXT_PUBLIC_BRAND_NAME?.trim() ||
    process.env.COMPANY_NAME?.trim() || // rétro-compat
    'ScanBridge'
  )
}

function getBrandLogoUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim() ||
    '/scanbridge-logo.svg'
  )
}

function getBrandPhone(): string {
  return process.env.NEXT_PUBLIC_BRAND_PHONE?.trim() || ''
}

/**
 * Construit le bloc <img> du logo avec les bons attributs alt/width/height.
 * Échappe l'URL pour prévenir les injections XSS via la variable d'env.
 */
function getLogoImgHtml(opts: {
  width: number
  height: number
  extraClass?: string
}): string {
  const url = escapeHtml(getBrandLogoUrl())
  const brand = escapeHtml(getBrandName())
  return `<img src="${url}" alt="Logo ${brand}" width="${opts.width}" height="${opts.height}" class="${opts.extraClass ?? ''}" />`
}

/**
 * Génère l'HTML complet de la page d'attente.
 *
 * @param opts.targetUrl URL cible de redirection (null si sticker non configuré)
 * @param opts.slug slug du sticker (affiché pour diagnostic)
 * @param opts.configured true si l'URL cible existe et le sticker est actif
 */
export function renderWaitingPage(opts: {
  targetUrl: string | null
  slug: string
  configured: boolean
}): string {
  const { targetUrl, slug, configured } = opts
  const brandName = escapeHtml(getBrandName())
  const slugHtml = escapeHtml(slug)
  const targetUrlHtml = targetUrl ? escapeHtml(targetUrl) : ''
  const targetUrlJs = targetUrl ? escapeJs(targetUrl) : ''

  // Logo de marque en haut de page (taille 56x56, centré)
  const brandLogoTop = getLogoImgHtml({
    width: 56,
    height: 56,
    extraClass: 'brand-logo',
  })
  // Logo miniature dans le footer (16x16)
  const brandLogoFooter = getLogoImgHtml({
    width: 16,
    height: 16,
    extraClass: 'footer-logo',
  })
  // Téléphone de marque (optionnel — affiché dans le footer)
  const brandPhone = escapeHtml(getBrandPhone())
  const footerLine = brandPhone
    ? `Propulsé par ${brandLogoFooter}<strong>${brandName}</strong> — Pour commander le vôtre : <strong>${brandPhone}</strong>`
    : `Propulsé par ${brandLogoFooter}<strong>${brandName}</strong>`

  // Pour le cas configuré : meta refresh + JS fallback après 600ms
  const metaRefresh = configured && targetUrl
    ? `<meta http-equiv="refresh" content="${(REDIRECT_DELAY_MS / 1000).toFixed(1)};url=${escapeHtml(targetUrl)}">`
    : ''

  // JS redirect (double sécurité si meta refresh désactivé par le navigateur)
  const jsRedirect = configured && targetUrl
    ? `<script>
      (function(){{
        var t = setTimeout(function(){{
          window.location.replace(${targetUrlJs});
        }}, ${REDIRECT_DELAY_MS});
        // Si l'onglet perd le focus pendant le délai, on annule le redirect auto
        // (l'utilisateur reviendra et pourra cliquer manuellement)
        window.addEventListener('blur', function(){{
          clearTimeout(t);
        }});
        window.addEventListener('beforeunload', function(){{
          clearTimeout(t);
        }});
      }})();
    </script>`
    : ''

  // Icône et couleurs selon l'état
  const isConfigured = configured && !!targetUrl
  const accent = isConfigured ? '#10b981' : '#f59e0b' // emerald-500 ou amber-500
  const accentRgb = isConfigured ? '16, 185, 129' : '245, 158, 11'
  const badgeBg = `rgba(${accentRgb}, 0.12)`
  const spinnerBorder = `rgba(255,255,255,0.08)`
  const spinnerAccent = accent

  // Icône : cadenas (configuré) ou horloge (en attente)
  const iconPath = isConfigured
    ? `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>`
    : `<circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>`

  // Titre + sous-titre selon l'état
  const title = isConfigured
    ? 'Connexion sécurisée'
    : 'Sticker en attente de configuration'
  const subtitle = isConfigured
    ? `via <strong>${brandName}</strong>`
    : 'Ce sticker n\'est pas encore actif'
  const bodyMessage = isConfigured
    ? 'Redirection vers la page du commerçant en cours…'
    : 'Le commerçant n\'a pas encore renseigné l\'URL de redirection. Revenez dans quelques instants ou contactez l\'établissement.'

  // Section basse : URL cible + bouton manuel (seulement si configuré)
  const targetSection = isConfigured && targetUrlHtml
    ? `
        <div class="target-box">
          <div class="target-label">Destination</div>
          <div class="target-url" title="${targetUrlHtml}">${targetUrlHtml}</div>
        </div>
        <a href="${targetUrlHtml}" class="btn-primary" id="manual-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
          </svg>
          <span>Continuer maintenant</span>
        </a>`
    : `
        <div class="slug-box">
          <span class="slug-label">Référence sticker</span>
          <code class="slug-value">${slugHtml}</code>
        </div>`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ${metaRefresh}
  <title>${title} — ${brandName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      background:
        radial-gradient(ellipse at top, #1f1f23 0%, #0a0a0a 60%),
        #000;
      color: #fafafa;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 26rem;
      width: 100%;
      text-align: center;
      animation: fadein 0.4s ease-out;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.95rem;
      border-radius: 9999px;
      background: ${badgeBg};
      color: ${accent};
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      margin-bottom: 1.75rem;
      border: 1px solid rgba(${accentRgb}, 0.25);
    }
    .badge svg { display: block; }

    .hero {
      position: relative;
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
    }
    .spinner {
      position: absolute;
      inset: 0;
      border: 3px solid ${spinnerBorder};
      border-top-color: ${spinnerAccent};
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
    }
    .hero-icon {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${accent};
    }
    .hero-icon svg { width: 26px; height: 26px; }

    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
      color: #fafafa;
    }
    .subtitle {
      color: #a1a1a1;
      font-size: 0.95rem;
      margin-bottom: 0.4rem;
    }
    .subtitle strong { color: #d4d4d8; font-weight: 600; }
    .body-msg {
      color: #71717a;
      font-size: 0.9rem;
      line-height: 1.5;
      max-width: 22rem;
      margin: 0 auto 1.75rem;
    }

    .target-box, .slug-box {
      padding: 0.6rem 0.9rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }
    .target-label, .slug-label {
      display: block;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #52525b;
      margin-bottom: 0.2rem;
      font-weight: 600;
    }
    .target-url {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 0.75rem;
      color: #a1a1a1;
      word-break: break-all;
      line-height: 1.4;
    }
    .slug-value {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 0.8rem;
      color: #d4d4d8;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      background: ${accent};
      color: #000;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.85rem;
      transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
      box-shadow: 0 0 0 0 rgba(${accentRgb}, 0.4);
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 20px -4px rgba(${accentRgb}, 0.35);
    }
    .btn-primary:active { transform: translateY(0); }

    .footer {
      margin-top: 3rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.72rem;
      color: #52525b;
    }
    .footer strong { color: #71717a; font-weight: 500; }
    .footer-logo {
      display: inline-block;
      vertical-align: middle;
      margin-right: 0.35rem;
      opacity: 0.7;
    }

    /* Branding en haut de page */
    .brand-top {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 1.75rem;
    }
    .brand-logo {
      display: block;
      filter: drop-shadow(0 4px 16px rgba(16, 185, 129, 0.15));
    }
    .brand-name {
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #71717a;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadein {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .spinner { animation: none; border-top-color: ${accent}; }
      .container { animation: none; }
      .btn-primary { transition: none; }
    }
  </style>
</head>
<body>
  <main class="container" role="main">
    <div class="brand-top">
      ${brandLogoTop}
      <div class="brand-name">${brandName}</div>
    </div>

    <div class="badge" role="status" aria-live="polite">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        ${iconPath}
      </svg>
      <span>${isConfigured ? 'Sécurisé' : 'En attente'}</span>
    </div>

    <div class="hero" aria-hidden="true">
      <div class="spinner"></div>
      <div class="hero-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${iconPath}
        </svg>
      </div>
    </div>

    <h1>${title}</h1>
    <p class="subtitle">${subtitle}</p>
    <p class="body-msg">${bodyMessage}</p>

    ${targetSection}

    <div class="footer">
      ${footerLine}
    </div>
  </main>

  ${jsRedirect}
</body>
</html>`
}
