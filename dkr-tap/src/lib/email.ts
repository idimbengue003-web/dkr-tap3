import { Resend } from 'resend'

/**
 * Service d'envoi d'emails via Resend.
 *
 * Variables d'environnement requises :
 * - RESEND_API_KEY : clé API Resend (re_...)
 *
 * Optionnel (recommandé pour prod) :
 * - RESEND_FROM_EMAIL : adresse expéditeur (ex: noreply@dkrtap.site)
 *   ⚠️ Nécessite de vérifier le domaine dkrtap.site dans Resend dashboard.
 *   Sans vérification, on utilise onboarding@resend.dev (test seulement,
 *   peut envoyer uniquement à l'email associé au compte Resend).
 * - NEXT_PUBLIC_SITE_URL : URL publique du site (https://www.dkrtap.site)
 * - NEXT_PUBLIC_BRAND_NAME : nom de marque (DKR TAP)
 * - NEXT_PUBLIC_BRAND_PHONE : téléphone affiché dans les emails
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'DKR TAP'
const BRAND_PHONE = process.env.NEXT_PUBLIC_BRAND_PHONE || '78 927 12 96'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dkrtap.site'

// Lazy init : on ne crée l'instance Resend que si la clé API est dispo
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY non configuré — email non envoyé')
    return null
  }
  if (!_resend) _resend = new Resend(RESEND_API_KEY)
  return _resend
}

function formatFCFA(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/** Wrapper HTML commun à tous les emails (design dark comme le site) */
function emailShell(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e4e4e7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#18181b;border-radius:16px;overflow:hidden;border:1px solid #27272a;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;background:linear-gradient(135deg,#10b98115 0%,#0a0a0a 100%);border-bottom:1px solid #27272a;text-align:center;">
              <h1 style="margin:0 0 4px;color:#10b981;font-size:24px;font-weight:700;letter-spacing:-0.02em;">${BRAND_NAME}</h1>
              <p style="margin:0;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Cartes QR pour réseaux sociaux</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;color:#e4e4e7;font-size:14px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#0a0a0a;border-top:1px solid #27272a;text-align:center;">
              <p style="margin:0 0 8px;color:#71717a;font-size:12px;">
                📞 ${BRAND_PHONE} &nbsp;•&nbsp; 🌐 ${SITE_URL}
              </p>
              <p style="margin:0;color:#52525b;font-size:11px;">
                © ${new Date().getFullYear()} ${BRAND_NAME}. Dakar, Sénégal. Cet email est automatique, ne pas répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Bouton CTA stylé */
function ctaButton(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background-color:#10b981;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;margin:16px 0;">${label}</a>`
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false

  try {
    const { data, error } = await resend.emails.send({
      from: `${BRAND_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error('[email] Erreur Resend:', error)
      return false
    }

    console.log(`[email] ✓ Email envoyé à ${to} — subject: "${subject}" — id: ${data?.id}`)
    return true
  } catch (e) {
    console.error('[email] Exception:', e)
    return false
  }
}

/* ============ TEMPLATES ============ */

type OrderData = {
  id: string
  totalAfter: number
  totalQty: number
  discountPct: number
  items: Array<{ name: string; qty: number; unitPrice: number; parentName?: string }>
}

/** Email de création de commande (status pending) */
export async function sendOrderCreatedEmail(to: string, order: OrderData): Promise<boolean> {
  const itemsHtml = order.items.map((it) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #27272a;">
        ${it.parentName ? `<span style="color:#71717a;font-size:11px;">${it.parentName} ›</span> ` : ''}<strong style="color:#e4e4e7;">${it.name}</strong>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #27272a;text-align:right;color:#a1a1aa;">${it.qty} × ${formatFCFA(it.unitPrice)}</td>
    </tr>
  `).join('')

  const content = `
    <h2 style="margin:0 0 16px;color:#e4e4e7;font-size:20px;font-weight:700;">Commande créée ✅</h2>
    <p style="margin:0 0 16px;color:#a1a1aa;">Bonjour,<br>Votre commande <strong style="color:#10b981;font-family:monospace;">${order.id}</strong> a bien été enregistrée. Elle est en attente de paiement.</p>
    
    <div style="background-color:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${itemsHtml}
      </table>
      <div style="padding-top:12px;margin-top:8px;border-top:2px solid #27272a;display:flex;justify-content:space-between;align-items:baseline;">
        <strong style="color:#e4e4e7;">Total à payer</strong>
        <span style="color:#10b981;font-size:20px;font-weight:700;">${formatFCFA(order.totalAfter)}</span>
      </div>
      ${order.discountPct > 0 ? `<p style="margin:8px 0 0;color:#10b981;font-size:12px;">🎉 Remise volume de ${order.discountPct}% appliquée</p>` : ''}
    </div>

    <p style="margin:16px 0;color:#a1a1aa;">Finalisez votre paiement Wave pour activer vos cartes QR. La vérification est automatique (15-30 secondes).</p>
    ${ctaButton('Voir ma commande', `${SITE_URL}/account`)}
    
    <p style="margin:16px 0;color:#52525b;font-size:12px;background-color:#27272a;padding:12px;border-radius:6px;">⚠️ Vos cartes QR sont déjà créées dans votre compte (status "En attente de paiement"). Configurez leur lien de redirection dès maintenant !</p>
  `

  return sendEmail(to, `Commande ${order.id} — en attente de paiement`, emailShell(content, 'Commande créée'))
}

/** Email de confirmation de paiement (status paid) */
export async function sendOrderPaidEmail(to: string, order: OrderData): Promise<boolean> {
  const content = `
    <h2 style="margin:0 0 16px;color:#10b981;font-size:20px;font-weight:700;">Paiement confirmé ! 🎉</h2>
    <p style="margin:0 0 16px;color:#a1a1aa;">Bonjour,<br>Votre paiement Wave pour la commande <strong style="color:#10b981;font-family:monospace;">${order.id}</strong> a bien été reçu. <strong style="color:#10b981;">Vos cartes QR sont maintenant activées !</strong></p>
    
    <div style="background-color:#0a0a0a;border:1px solid #10b981;border-radius:8px;padding:16px 20px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 4px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;">Montant payé</p>
      <p style="margin:0;color:#10b981;font-size:28px;font-weight:700;">${formatFCFA(order.totalAfter)}</p>
      <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">${order.totalQty} carte${order.totalQty > 1 ? 's' : ''} QR</p>
    </div>

    <p style="margin:16px 0;color:#a1a1aa;">Vos cartes QR sont désormais <strong style="color:#10b981;">scannables</strong>. Configurez leur lien de redirection dès maintenant si ce n'est pas déjà fait.</p>
    ${ctaButton('Configurer mes cartes', `${SITE_URL}/account`)}

    <p style="margin:16px 0;color:#52525b;font-size:12px;">Prochaine étape : impression + livraison sous 24-48h (Dakar). Vous recevrez un email à chaque étape.</p>
  `

  return sendEmail(to, `✅ Paiement confirmé — ${order.id}`, emailShell(content, 'Paiement confirmé'))
}

/** Email de mise à jour de statut (printing/shipped/delivered) */
export async function sendOrderStatusEmail(
  to: string,
  orderId: string,
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  const STATUS_INFO: Record<string, { label: string; desc: string; icon: string }> = {
    pending: { label: 'En attente de paiement', desc: 'Paiement Wave en cours de vérification.', icon: '⏳' },
    paid: { label: 'Payée', desc: 'Paiement reçu. Cartes QR activées.', icon: '✅' },
    printing: { label: 'Impression en cours', desc: 'Vos cartes sont en cours d\'impression.', icon: '🖨️' },
    shipped: { label: 'Expédiée', desc: 'Vos cartes ont été remises au transporteur.', icon: '📦' },
    delivered: { label: 'Livrée', desc: 'Vos cartes ont été livrées à votre adresse.', icon: '🎉' },
    confirmed: { label: 'Confirmée', desc: 'Commande finalisée.', icon: '✓' },
    cancelled: { label: 'Annulée', desc: 'Commande annulée.', icon: '❌' },
  }

  const info = STATUS_INFO[newStatus] || { label: newStatus, desc: '', icon: '•' }
  const oldInfo = STATUS_INFO[oldStatus]

  const content = `
    <h2 style="margin:0 0 16px;color:#e4e4e7;font-size:20px;font-weight:700;">${info.icon} Mise à jour de votre commande</h2>
    <p style="margin:0 0 16px;color:#a1a1aa;">Bonjour,<br>Le statut de votre commande <strong style="color:#10b981;font-family:monospace;">${orderId}</strong> a changé.</p>
    
    <div style="background-color:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 4px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;">Nouveau statut</p>
      <p style="margin:0 0 8px;color:#10b981;font-size:18px;font-weight:700;">${info.icon} ${info.label}</p>
      <p style="margin:0;color:#a1a1aa;font-size:13px;">${info.desc}</p>
      ${oldInfo ? `<p style="margin:8px 0 0;color:#52525b;font-size:11px;">Statut précédent : ${oldInfo.label}</p>` : ''}
    </div>

    ${ctaButton('Voir ma commande', `${SITE_URL}/account`)}
  `

  return sendEmail(to, `${info.icon} ${info.label} — ${orderId}`, emailShell(content, 'Mise à jour commande'))
}

/** Email de bonus de parrainage */
export async function sendReferralBonusEmail(
  to: string,
  role: 'parrain' | 'filleul',
  amount: number,
  otherEmail: string
): Promise<boolean> {
  const isParrain = role === 'parrain'
  const content = `
    <h2 style="margin:0 0 16px;color:#10b981;font-size:20px;font-weight:700;">🎁 Bonus de parrainage crédité !</h2>
    <p style="margin:0 0 16px;color:#a1a1aa;">Bonjour,<br>
    ${isParrain
      ? `Vous avez parrainé <strong style="color:#10b981;">${otherEmail}</strong> qui vient de créer son compte DKR TAP.`
      : `Vous avez été parrainé par <strong style="color:#10b981;">${otherEmail}</strong> et avez reçu un bonus de bienvenue.`
    }</p>
    
    <div style="background-color:#0a0a0a;border:1px solid #10b981;border-radius:8px;padding:16px 20px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 4px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;">Bonus crédité</p>
      <p style="margin:0;color:#10b981;font-size:32px;font-weight:700;">+${formatFCFA(amount)}</p>
      <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">sur votre solde DKR TAP</p>
    </div>

    <p style="margin:16px 0;color:#a1a1aa;">Votre nouveau solde est immédiatement disponible pour payer vos prochaines commandes.</p>
    ${ctaButton('Voir mon solde', `${SITE_URL}/recharger`)}
  `

  return sendEmail(
    to,
    `🎁 +${formatFCFA(amount)} sur votre solde DKR TAP`,
    emailShell(content, 'Bonus parrainage')
  )
}

/** Email de bienvenue (première connexion Google) */
export async function sendWelcomeEmail(to: string, name?: string | null): Promise<boolean> {
  const content = `
    <h2 style="margin:0 0 16px;color:#10b981;font-size:24px;font-weight:700;">Bienvenue sur DKR TAP 👋</h2>
    <p style="margin:0 0 16px;color:#a1a1aa;">Bonjour ${name || ''},<br>
    Votre compte DKR TAP a été créé avec succès. Vous pouvez maintenant :</p>
    
    <ul style="margin:0 0 16px;color:#a1a1aa;padding-left:24px;line-height:1.8;">
      <li>Commander des cartes QR pour vos réseaux sociaux</li>
      <li>Recharger votre solde wallet (paiement rapide sans repasser par Wave)</li>
      <li>Suivre vos commandes + statut de livraison</li>
      <li>Configurer et modifier le lien de redirection de chaque carte QR</li>
      <li>Voir vos statistiques de scans</li>
    </ul>

    <p style="margin:16px 0;color:#a1a1aa;">Pour commencer :</p>
    ${ctaButton('Voir les modèles', `${SITE_URL}/#modeles`)}
    <br>
    ${ctaButton('Recharger mon solde', `${SITE_URL}/recharger`)}
    
    <p style="margin:24px 0 0;color:#52525b;font-size:12px;background-color:#27272a;padding:12px;border-radius:6px;">💡 Astuce : utilisez le Pack Revendeur (5 IG + 2 Snap + 3 FB + 2 YT = 12 cartes) pour débloquer automatiquement 17% de remise !</p>
  `

  return sendEmail(to, `Bienvenue sur ${BRAND_NAME} 🎉`, emailShell(content, 'Bienvenue'))
}

/** Email de confirmation de recharge wallet */
export async function sendWalletRechargedEmail(to: string, amount: number, newBalance: number): Promise<boolean> {
  const content = `
    <h2 style="margin:0 0 16px;color:#10b981;font-size:20px;font-weight:700;">💸 Solde rechargé !</h2>
    <p style="margin:0 0 16px;color:#a1a1aa;">Bonjour,<br>Votre paiement Wave a été reçu et votre solde a été crédité.</p>
    
    <div style="background-color:#0a0a0a;border:1px solid #10b981;border-radius:8px;padding:16px 20px;margin:16px 0;text-align:center;">
      <p style="margin:0 0 4px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;">Montant crédité</p>
      <p style="margin:0;color:#10b981;font-size:32px;font-weight:700;">+${formatFCFA(amount)}</p>
      <p style="margin:8px 0 0;color:#a1a1aa;font-size:13px;">Nouveau solde : <strong style="color:#10b981;">${formatFCFA(newBalance)}</strong></p>
    </div>

    <p style="margin:16px 0;color:#a1a1aa;">Vous pouvez maintenant payer vos commandes instantanément, sans repasser par Wave.</p>
    ${ctaButton('Voir mes commandes', `${SITE_URL}/account`)}
  `

  return sendEmail(to, `💸 Solde rechargé +${formatFCFA(amount)}`, emailShell(content, 'Solde rechargé'))
}

/** Email NOTIFICATION ADMIN — envoyé à toi quand une nouvelle commande est reçue */
export async function sendAdminNewOrderEmail(
  orderId: string,
  totalAfter: number,
  totalQty: number,
  customerName: string | null,
  customerPhone: string | null,
  items: Array<{ name: string; qty: number; unitPrice: number }>
): Promise<boolean> {
  const itemsHtml = items.map((it) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #27272a;">
        <strong style="color:#e4e4e7;">${it.name}</strong>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #27272a;text-align:right;color:#a1a1aa;">
        ${it.qty} × ${formatFCFA(it.unitPrice)}
      </td>
    </tr>
  `).join('')

  const content = `
    <h2 style="margin:0 0 16px;color:#10b981;font-size:20px;font-weight:700;">🔔 Nouvelle commande reçue !</h2>
    
    <div style="background-color:#0a0a0a;border:1px solid #10b981;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 4px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;">Commande</p>
      <p style="margin:0 0 12px;color:#10b981;font-size:18px;font-weight:700;font-family:monospace;">${orderId}</p>
      
      <table width="100%" cellpadding="0" cellspacing="0">
        ${itemsHtml}
      </table>
      
      <div style="padding-top:12px;margin-top:8px;border-top:2px solid #27272a;display:flex;justify-content:space-between;align-items:baseline;">
        <strong style="color:#e4e4e7;">Total</strong>
        <span style="color:#10b981;font-size:20px;font-weight:700;">${formatFCFA(totalAfter)}</span>
      </div>
      <p style="margin:8px 0 0;color:#a1a1aa;font-size:13px;">${totalQty} carte${totalQty > 1 ? 's' : ''}</p>
    </div>

    <div style="background-color:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:12px 16px;margin:16px 0;">
      <p style="margin:0 0 4px;color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;">Client</p>
      <p style="margin:0 0 2px;color:#e4e4e7;">${customerName || 'Non fourni'}</p>
      <p style="margin:0;color:#a1a1aa;font-size:13px;">${customerPhone || 'Pas de téléphone'}</p>
    </div>

    ${ctaButton('Voir dans l\'admin', `${SITE_URL}/admin`)}
    
    <p style="margin:12px 0 0;color:#52525b;font-size:12px;">Connecte-toi à l'admin pour confirmer le paiement et mettre à jour le statut de livraison.</p>
  `

  return sendEmail(
    'dkrtap@gmail.com',
    `🔔 Nouvelle commande ${orderId} — ${formatFCFA(totalAfter)} (${totalQty} cartes)`,
    emailShell(content, 'Nouvelle commande')
  )
}
