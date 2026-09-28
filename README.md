# QR Passerelle

Passerelle de redirection QR code avec interface d'administration.
Chaque sticker physique porte un QR code qui pointe vers `https://VOTRE-DOMAINE/api/r/<slug>`.
Quand quelqu'un scanne le QR, l'application redirige (302) vers l'URL cible configurée pour ce slug — modifiable à tout moment depuis l'interface admin, sans réimprimer le QR.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript 5
- Prisma + SQLite (base fichier local — pour Railway, voir ci-dessous)
- Tailwind CSS 4 + shadcn/ui (composants) + lucide-react (icônes)
- Auth stateless par cookie HMAC-SHA256 (cookie `httpOnly`)
- QR code généré localement via `qrcode.react` (aucune dépendance externe)

## Variables d'environnement

| Variable | Description | Défaut dev |
|---|---|---|
| `DATABASE_URL` | URL Prisma — `file:./db/custom.db` en local | oui |
| `ADMIN_PASSWORD` | Mot de passe pour accéder à l'interface admin + API `/api/stickers` | requis |
| `AUTH_SESSION_HOURS` | Durée de validité du cookie admin en heures | `24` |

⚠️ **Sans `ADMIN_PASSWORD`, l'accès à l'admin est bloqué** (page d'erreur explicite + API renvoie 503).

## Déploiement sur Railway

Railway est compatible Node.js natif — pas besoin d'adapter le code, juste quelques configs.

### 1. Préparer Railway

1. Créer un nouveau projet sur [railway.app](https://railway.app)
2. Choisir **"Deploy from GitHub repo"** et connecter ce dépôt
3. Railway détecte automatiquement Next.js et lance `npm run build && npm start`

### 2. Variables d'environnement Railway

Dans **Variables** du service Railway, ajouter :

```bash
ADMIN_PASSWORD=<votre-mot-de-passe-secret-fort>
AUTH_SESSION_HOURS=8
DATABASE_URL=file:/data/custom.db
```

Pour la persistance de la base SQLite sur Railway, créer un **Volume** :

- Onglet **Settings → Volumes → Add Volume**
- Mount path : `/data`
- Railway fournit un chemin persistant — la base survivra aux redémarrages

### 3. Build & Start commands

Railway utilise par défaut `next build` + `next start`. Pas besoin de configurer. Si vous voulez être explicite :

```jsonc
// railway.json ou Settings → Build
"buildCommand": "prisma generate && next build",
"startCommand": "prisma db push --accept-data-loss && next start"
```

### 4. Domaine publique

Dans **Settings → Networking → Generate Domain** pour obtenir `https://<votre-app>.up.railway.app`.

C'est l'URL à encoder dans les QR codes (format : `https://<votre-app>.up.railway.app/api/r/<slug>`).

## API endpoints

| Méthode | Route | Auth | Rôle |
|---|---|---|---|
| GET | `/api/r/<slug>` | Public | Redirige 302 vers l'URL cible (ou `/not-configured` si non configuré) |
| GET | `/api/stickers` | Cookie admin | Liste tous les stickers |
| POST | `/api/stickers` | Cookie admin | Crée un sticker |
| PUT | `/api/stickers/<id>` | Cookie admin | Modifie label, targetUrl, active |
| DELETE | `/api/stickers/<id>` | Cookie admin | Supprime un sticker |
| POST | `/api/auth/login` | Public | Connecte (body: `{password}`) → set cookie |
| POST | `/api/auth/logout` | Public | Déconnecte |
| GET | `/api/auth/check` | Public | Retourne `{configured, authenticated}` |

## Développement local

```bash
bun install
bun run db:push     # crée la base SQLite
bun run dev         # http://localhost:3000
```

Le serveur dev recharge automatiquement les modifications.

## Migration vers PostgreSQL (optionnel)

Si le volume SQLite de Railway devient limitant, migrer vers PostgreSQL Railway :

1. Ajouter le plugin PostgreSQL sur Railway
2. Récupérer `DATABASE_URL` (format `postgresql://...`)
3. Dans `prisma/schema.prisma`, changer `provider = "sqlite"` → `provider = "postgresql"`
4. Lancer `prisma db push` au démarrage (railway.json startCommand ci-dessus le fait déjà)
