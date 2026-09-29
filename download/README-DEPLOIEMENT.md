# 🚀 Déploiement DKR TAP — Guide pas à pas

Ce guide vous accompagne pour mettre DKR TAP en ligne sur Vercel (gratuit).
**Aucune compétence technique requise** — juste suivre les étapes.

---

## Étape 1 : Mettre le code sur GitHub

### Option A : Upload via l'interface web GitHub (le plus simple, pas de git requis)

1. **Créez un compte GitHub** si vous n'en avez pas (gratuit) : https://github.com/signup
2. **Créez un nouveau repo** :
   - Allez sur https://github.com/new
   - Repository name : `dkr-tap`
   - Cochez "Add a README file"
   - Cliquez **Create repository**
3. **Uploadez les fichiers** :
   - Sur la page de votre nouveau repo, cliquez **"Add file" → "Upload files"**
   - Décompressez le ZIP `dkr-tap.zip` sur votre ordinateur
   - Glissez-déposez TOUS les fichiers (dossiers `src/`, `public/`, `scripts/` et fichiers à la racine) dans GitHub
   - Attendez que tout soit uploadé
   - Cliquez **Commit changes**

### Option B : Ligne de commande git (si vous êtes à l'aise)

```bash
unzip dkr-tap.zip -d dkr-tap
cd dkr-tap
git init
git add .
git commit -m "DKR TAP - Passerelle QR"
git branch -M main
git remote add origin https://github.com/VOTRE-USER/dkr-tap.git
git push -u origin main
```

---

## Étape 2 : Connecter Vercel à GitHub

1. Allez sur https://vercel.com/signup
2. Cliquez **"Continue with GitHub"** (connexion OAuth officielle)
3. Autorisez Vercel à accéder à votre compte GitHub
4. Cliquez **"Add New → Project"**
5. Cliquez **"Import"** sur votre repo `dkr-tap`
6. **Frame détecté automatiquement** : Next.js (rien à configurer)

---

## Étape 3 : Créer la base de données Vercel KV (gratuit)

1. Dans Vercel, allez sur **"Storage"** dans le dashboard de votre projet
2. Cliquez **"Create Database"**
3. Sélectionnez **"KV"** (Upstash)
4. Donnez un nom : `dkr-tap-kv`
5. Cliquez **"Connect to Project"** (sélectionnez votre projet DKR TAP)

✅ Les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` sont maintenant automatiquement injectées dans votre projet Vercel.

---

## Étape 4 : Configurer les variables d'environnement

1. Allez dans **Project Settings → Environment Variables**
2. Ajoutez ces variables (cliquez "Add" après chaque) :

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | (votre mot de passe admin, CHOISI PAR VOUS, complexe) |
| `AUTH_SESSION_HOURS` | `8` |
| `NEXT_PUBLIC_BRAND_NAME` | `DKR TAP` |
| `NEXT_PUBLIC_BRAND_LOGO_URL` | `/scanbridge-logo.svg` |
| `NEXT_PUBLIC_BRAND_PHONE` | `78 927 12 96` |

3. Après avoir ajouté toutes les variables, allez dans **Deployments**
4. Cliquez sur le dernier déploiement → menu **⋯** → **Redeploy**

---

## Étape 5 : Récupérer votre domaine public

1. Allez dans **Project Settings → Domains**
2. Vercel a généré un domaine automatique : `https://dkr-tap-XXXX.vercel.app`
3. C'est **votre domaine public** — c'est l'URL à encoder dans les QR codes

Pour chaque sticker créé dans l'admin, l'URL scannable sera :
```
https://dkr-tap-XXXX.vercel.app/api/r/<slug-du-sticker>
```

---

## Étape 6 : Premier usage

1. Visitez `https://dkr-tap-XXXX.vercel.app` sur votre ordinateur ou téléphone
2. Saisissez votre `ADMIN_PASSWORD`
3. Cliquez "Nouveau sticker"
4. Remplissez : label, URL cible (ex: https://www.tiktok.com/@votre-client)
5. Cliquez "Créer"
6. Cliquez sur l'icône QR du sticker → "Télécharger le sticker"
7. Vous obtenez un PNG 10×10 cm prêt à imprimer

⚠️ **Test du scan** : la caméra ne fonctionne qu'en HTTPS (ce qui est le cas sur Vercel, pas en localhost).

---

## ❓ Aide

- Si la page admin affiche "Authentification non configurée" → vous avez oublié `ADMIN_PASSWORD` dans les variables d'env
- Si les stickers disparaissent après redéploiement → vous avez oublié de créer la KV database
- Si la caméra ne marche pas → vérifiez que vous êtes en HTTPS (pas http://)
