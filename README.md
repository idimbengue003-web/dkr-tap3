# DKR TAP — Passerelle QR

Passerelle de redirection QR code avec interface d'administration.
Chaque sticker physique porte un QR code qui pointe vers `https://VOTRE-DOMAINE/api/r/<slug>`.
Quand quelqu'un scanne le QR, l'application affiche une page d'attente branded puis redirige (auto après 600 ms) vers l'URL cible — modifiable à tout moment depuis l'admin, sans réimprimer le QR.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript 5
- **Vercel KV** (Redis managé) pour le stockage — _compatibilité Vercel gratuite_
- Tailwind CSS 4 + shadcn/ui (composants) + lucide-react (icônes)
- Auth stateless par cookie HMAC-SHA256 (cookie `httpOnly`)
- QR code généré localement via `qrcode.react` (aucune dépendance externe)

## Variables d'environnement

| Variable | Description | Défaut dev |
|---|---|---|
| `KV_REST_API_URL` | URL Vercel KV (auto-injectée sur Vercel) | mock si absent |
| `KV_REST_API_TOKEN` | Token Vercel KV (auto-injecté sur Vercel) | mock si absent |
| `ADMIN_PASSWORD` | Mot de passe pour accéder à l'admin + API `/api/stickers` | requis |
| `AUTH_SESSION_HOURS` | Durée de validité du cookie admin en heures | `24` |
| `NEXT_PUBLIC_BRAND_NAME` | Nom de marque affiché partout | `ScanBridge` |
| `NEXT_PUBLIC_BRAND_LOGO_URL` | URL du logo de marque | `/scanbridge-logo.svg` |
| `NEXT_PUBLIC_BRAND_PHONE` | Téléphone affiché sur stickers + page d'attente | vide |

⚠️ **Sans `ADMIN_PASSWORD`, l'accès à l'admin est bloqué** (page d'erreur explicite + API renvoie 503).

## 💚 Déploiement sur Vercel (gratuit)

Vercel KV a un free tier généreux (30 000 commandes/jour) — largement suffisant pour un réseau de stickers QR.

### Étapes

1. **Pousser le code sur GitHub**

2. **Sur [vercel.com](https://vercel.com)** : "Add New → Project" → importer le repo GitHub
   - Vercel détecte automatiquement Next.js → build & start par défaut

3. **Créer la KV database** (gratuit)
   - Onglet **Storage → Create Database → KV**
   - Nom : `dkr-tap-kv` (ou autre)
   - Region : la plus proche de vos clients
   - **Connect to Project** : sélectionner votre projet Vercel
   - Les variables `KV_REST_API_URL`, `KV_REST_API_TOKEN` etc. sont **automatiquement injectées** dans le projet

4. **Configurer les variables d'env** (Project Settings → Environment Variables)
   ```
   ADMIN_PASSWORD=<votre-mot-de-passe-fort>
   AUTH_SESSION_HOURS=8
   NEXT_PUBLIC_BRAND_NAME=DKR TAP
   NEXT_PUBLIC_BRAND_LOGO_URL=/scanbridge-logo.svg
   NEXT_PUBLIC_BRAND_PHONE=78 927 12 96
   ```

5. **Redéployer** (Deployments → Redeploy)

6. **Récupérer le domaine public** Vercel : `https://<votre-projet>.vercel.app`
   - C'est l'URL à encoder dans les QR codes
   - Format URL publique : `https://<votre-projet>.vercel.app/api/r/<slug>`

### Dev local sans Vercel KV

Aucune configuration nécessaire — un **MockKV en mémoire** est automatiquement utilisé quand les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` ne sont pas définies. Les données ne persistent pas entre redémarrages, mais l'app fonctionne pour le dev et les tests.

```bash
bun install
bun run dev   # http://localhost:3000
```

Pour tester avec un vrai Vercel KV en local :
1. Créez la KV database sur Vercel
2. Récupérez les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` (Settings → Environment Variables)
3. Mettez-les dans `.env.local` : `vercel env pull .env.local`
4. Le client `@vercel/kv` les détectera automatiquement

## Structure de stockage KV

L'app utilise 4 types de clés :

| Clé | Type | Valeur |
|---|---|---|
| `sticker:<slug>` | String (JSON) | Objet sticker (id, slug, label, targetUrl, active, createdAt, updatedAt) |
| `stickerId:<id>` | String | slug (mapping pour lookup par id) |
| `stickers:by_created` | ZSET | score = timestamp createdAt, member = slug (pour lister triés par date) |
| `scans:<slug>` | Integer | compteur de scans (incrément atomique via `INCR`) |

Le scan count est stocké dans une clé séparée pour permettre l'incrément atomique (pas de race condition en serverless).

## API endpoints

| Méthode | Route | Auth | Rôle |
|---|---|---|---|
| GET | `/api/r/<slug>` | Public | Page d'attente + redirect 600 ms |
| GET | `/api/stickers` | Cookie admin | Liste tous les stickers |
| POST | `/api/stickers` | Cookie admin | Crée un sticker |
| PUT | `/api/stickers/<id>` | Cookie admin | Modifie label, targetUrl, active |
| DELETE | `/api/stickers/<id>` | Cookie admin | Supprime un sticker |
| POST | `/api/auth/login` | Public | Connecte (body: `{password}`) → set cookie |
| POST | `/api/auth/logout` | Public | Déconnecte |
| GET | `/api/auth/check` | Public | Retourne `{configured, authenticated}` |

## Sticker physique (10×10 cm)

Le template de sticker est généré automatiquement par l'admin (bouton "Voir le QR code" → "Télécharger le sticker"). Layout :

```
┌─────────────────────────────┐
│  TOP : logo réseau + action │  ← auto-détecté depuis l'URL cible
│  "Laissez-nous 5 étoiles ⭐"│     (Google / TikTok / Instagram)
├─────────────────────────────┤
│  MIDDLE : QR code (460px)    │
├─────────────────────────────┤
│  BOTTOM : bande DKR TAP     │
│  + téléphone 78 927 12 96   │
└─────────────────────────────┘
```

PNG exporté en 1181×1181 px (300 DPI, prêt pour impression pro).

## Migration depuis Prisma + SQLite

Cette version utilise Vercel KV (Redis). Si vous migrez depuis une ancienne version SQLite :

1. Exportez vos stickers SQLite : `sqlite3 db/custom.db "SELECT * FROM Sticker;" > stickers.csv`
2. Créez la KV database sur Vercel (voir ci-dessus)
3. Pour chaque sticker, POST vers `/api/stickers` avec `{label, targetUrl, slug, active}`
4. Vérifiez via GET `/api/stickers`

Le script de migration n'est pas fourni automatiquement — la structure est simple (1 entité + scans), un script ad hoc en NodeJS prend 10 lignes.
