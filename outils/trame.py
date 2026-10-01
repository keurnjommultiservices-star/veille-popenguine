#!/usr/bin/env python3
"""Transforme une photo en fond tramé (points) pour l'en-tête du site.

Usage : python3 outils/trame.py photo.jpg public/cap-de-naze-trame.png
Options : --pas 9 (espacement des points)  --opacite 0.28  --largeur 1800
Résultat : PNG transparent, points blancs plus gros dans les zones claires.
"""
import argparse
from PIL import Image, ImageDraw, ImageOps, ImageFilter

p = argparse.ArgumentParser()
p.add_argument('entree'); p.add_argument('sortie')
p.add_argument('--pas', type=int, default=9)
p.add_argument('--opacite', type=float, default=0.28)
p.add_argument('--largeur', type=int, default=1800)
a = p.parse_args()

img = ImageOps.exif_transpose(Image.open(a.entree)).convert('L')
h = round(img.height * a.largeur / img.width)
img = img.resize((a.largeur, h), Image.LANCZOS)
img = ImageOps.autocontrast(img, cutoff=2).filter(ImageFilter.GaussianBlur(1.2))

S = 3  # suréchantillonnage pour des points lisses
out = Image.new('RGBA', (a.largeur * S, h * S), (255, 255, 255, 0))
d = ImageDraw.Draw(out)
alpha = round(255 * a.opacite)
for y in range(0, h, a.pas):
    for x in range(0, a.largeur, a.pas):
        v = img.getpixel((min(x + a.pas // 2, a.largeur - 1), min(y + a.pas // 2, h - 1))) / 255
        r = (a.pas / 2) * (v ** 0.9) * 0.95
        if r < 0.6:
            continue
        cx, cy = (x + a.pas / 2) * S, (y + a.pas / 2) * S
        d.ellipse([cx - r * S, cy - r * S, cx + r * S, cy + r * S], fill=(255, 255, 255, alpha))
out = out.resize((a.largeur, h), Image.LANCZOS)
out.save(a.sortie, optimize=True)
print('OK', a.sortie, out.size)
