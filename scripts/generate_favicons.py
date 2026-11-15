#!/usr/bin/env python3
"""
Génère tous les fichiers favicon / icônes PWA à partir du logo source
(public/dkrtap-logo.png).

v2 : zoom sur le logo (crop marges) + fond opaque (#0a0a0a) pour éliminer
    le blanc qui apparaissait dans les zones transparentes de l'onglet.

Sortie :
- src/app/favicon.ico       → ICO multi-résolution (16, 32, 48)
- src/app/icon.png          → 32×32 PNG (Next.js auto-génère <link rel="icon">)
- src/app/apple-icon.png    → 180×180 PNG (<link rel="apple-touch-icon">)
- public/icon-192.png       → 192×192 (PWA manifest)
- public/icon-512.png       → 512×512 (PWA manifest)
- public/icon-192-maskable.png → 192×192 avec safe zone (maskable)
- public/icon-512-maskable.png → 512×512 avec safe zone (maskable)
"""

from PIL import Image
import os

SRC = '/home/z/my-project/dkr-tap/public/dkrtap-logo.png'
APP_DIR = '/home/z/my-project/dkr-tap/src/app'
PUBLIC_DIR = '/home/z/my-project/dkr-tap/public'

# Couleur de fond pour combler les zones transparentes du logo.
# #0a0a0a = fond du site (dark) → pas de blanc dans l'onglet navigateur.
BG_COLOR = (10, 10, 10, 255)

# Zoom : pourcentage de marge à rogner de chaque côté.
# 8% → rogne 8% de chaque côté (gauche, droite, haut, bas) → le logo
# remplit ~17% plus de la surface du favicon.
CROP_MARGIN_PCT = 0.08

os.makedirs(APP_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

# Charger le logo source (614×614 RGBA)
raw = Image.open(SRC).convert('RGBA')
w, h = raw.size
print(f'Logo source : {w}×{h} {raw.mode}')

# 1. ZOOM : rogner les marges pour que le logo remplisse plus le cadre
mw = int(w * CROP_MARGIN_PCT)
mh = int(h * CROP_MARGIN_PCT)
cropped = raw.crop((mw, mh, w - mw, h - mh))
cw, ch = cropped.size
print(f'Après crop ({int(CROP_MARGIN_PCT*100)}% marges) : {cw}×{ch}')

# 2. FOND OPAQUE : combler les zones transparentes avec BG_COLOR
#    → plus de transparence = plus de blanc dans l'onglet navigateur
bg = Image.new('RGBA', (cw, ch), BG_COLOR)
bg.paste(cropped, (0, 0), cropped)
logo = bg.convert('RGBA')
print(f'Logo final : {logo.size[0]}×{logo.size[1]} (fond opaque #{BG_COLOR[0]:02x}{BG_COLOR[1]:02x}{BG_COLOR[2]:02x})')


def resize_logo(size: int) -> Image.Image:
    """Redimensionne le logo à size×size (Lanczos = haute qualité)."""
    return logo.resize((size, size), Image.LANCZOS)


def make_maskable(size: int) -> Image.Image:
    """Crée une icône maskable : canvas carré avec fond + logo centré à 80%
    (safe zone pour que le masque Android ne croppe pas le contenu)."""
    canvas = Image.new('RGBA', (size, size), BG_COLOR)
    logo_size = int(size * 0.80)  # 80% = safe zone maskable
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    offset = ((size - logo_size) // 2, (size - logo_size) // 2)
    canvas.paste(logo_resized, offset, logo_resized)
    return canvas


# 1. favicon.ico — multi-résolution (16, 32, 48)
sizes_ico = [16, 32, 48]
ico_images = [resize_logo(s) for s in sizes_ico]
ico_path = os.path.join(APP_DIR, 'favicon.ico')
ico_images[0].save(ico_path, format='ICO', sizes=[(s, s) for s in sizes_ico], append_images=ico_images[1:])
print(f'✓ {ico_path} ({os.path.getsize(ico_path)} bytes) — sizes {sizes_ico}')

# 2. icon.png — 32×32 (Next.js auto-détecte src/app/icon.png)
icon32 = resize_logo(32)
icon32_path = os.path.join(APP_DIR, 'icon.png')
icon32.save(icon32_path, format='PNG', optimize=True)
print(f'✓ {icon32_path} ({os.path.getsize(icon32_path)} bytes)')

# 3. apple-icon.png — 180×180 (Next.js auto-détecte src/app/apple-icon.png)
apple = resize_logo(180)
apple_path = os.path.join(APP_DIR, 'apple-icon.png')
apple.save(apple_path, format='PNG', optimize=True)
print(f'✓ {apple_path} ({os.path.getsize(apple_path)} bytes)')

# 4. PWA manifest icons
for size in [192, 512]:
    # Standard (any)
    img = resize_logo(size)
    path = os.path.join(PUBLIC_DIR, f'icon-{size}.png')
    img.save(path, format='PNG', optimize=True)
    print(f'✓ {path} ({os.path.getsize(path)} bytes)')

    # Maskable (avec safe zone)
    maskable = make_maskable(size)
    path_m = os.path.join(PUBLIC_DIR, f'icon-{size}-maskable.png')
    maskable.save(path_m, format='PNG', optimize=True)
    print(f'✓ {path_m} ({os.path.getsize(path_m)} bytes)')

print('\n✅ Favicons régénérés avec logo zoomé + fond opaque (plus de blanc).')
