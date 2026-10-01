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
p.add_argument('--gamma', type=float, default=0.9, help='contraste (plus grand = plus de détail)')
p.add_argument('--miroir', action='store_true', help='retourner l\'image horizontalement (décor)')
p.add_argument('--fondu', type=float, default=0.0, help='adoucit les bords gauche/droit (0.18 = 18%% de la largeur)')
p.add_argument('--ratio', default=None, help='recadrage, ex. 16:6')
p.add_argument('--cy', type=float, default=0.5, help='centre vertical du recadrage (0 à 1)')
a = p.parse_args()

img = ImageOps.exif_transpose(Image.open(a.entree)).convert('L')
if a.miroir:
    img = ImageOps.mirror(img)
if a.ratio:
    rw, rh = [float(x) for x in a.ratio.split(':')]
    th = round(img.width * rh / rw)
    if th < img.height:
        top = max(0, min(img.height - th, round(a.cy * img.height) - th // 2))
        img = img.crop((0, top, img.width, top + th))
    else:
        tw = round(img.height * rw / rh)
        left = (img.width - tw) // 2
        img = img.crop((left, 0, left + tw, img.height))
h = round(img.height * a.largeur / img.width)
img = img.resize((a.largeur, h), Image.LANCZOS)
img = ImageOps.autocontrast(img, cutoff=2).filter(ImageFilter.GaussianBlur(1.2))

S = 3  # suréchantillonnage pour des points lisses
out = Image.new('RGBA', (a.largeur * S, h * S), (255, 255, 255, 0))
d = ImageDraw.Draw(out)
base = 255 * a.opacite
ramp = max(1.0, a.fondu * a.largeur)
for y in range(0, h, a.pas):
    for x in range(0, a.largeur, a.pas):
        v = img.getpixel((min(x + a.pas // 2, a.largeur - 1), min(y + a.pas // 2, h - 1))) / 255
        r = (a.pas / 2) * (v ** a.gamma) * 0.95
        if r < 0.6:
            continue
        cx, cy = (x + a.pas / 2) * S, (y + a.pas / 2) * S
        d.ellipse([cx - r * S, cy - r * S, cx + r * S, cy + r * S], fill=(255, 255, 255, round(base * (min(1.0, (x + a.pas / 2) / ramp, (a.largeur - x - a.pas / 2) / ramp) if a.fondu else 1.0))))
out = out.resize((a.largeur, h), Image.LANCZOS)
out.save(a.sortie, optimize=True)
print('OK', a.sortie, out.size)
