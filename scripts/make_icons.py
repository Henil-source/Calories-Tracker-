#!/usr/bin/env python3
"""Draw the Thalika mark (plate ring with a saffron quarter) into every icon size the apps need."""
import os
from PIL import Image, ImageDraw

GREEN, SAFFRON, WHITE = (23, 112, 74), (242, 179, 61), (255, 255, 255)

def mark(size, bg=True, scale=1.0, radius=0.22):
    S = size * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if bg:
        d.rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * radius), fill=GREEN)
    c, r, w = S / 2, S * 0.30 * scale, S * 0.08 * scale
    d.pieslice((c - r, c - r, c + r, c + r), start=-90, end=0, fill=SAFFRON)
    d.ellipse((c - r, c - r, c + r, c + r), outline=WHITE, width=int(w))
    return im.resize((size, size), Image.LANCZOS)

root = os.path.join(os.path.dirname(__file__), "..")
res = os.path.join(root, "android", "app", "src", "main", "res")
for dpi, px in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    folder = os.path.join(res, f"mipmap-{dpi}")
    if os.path.isdir(folder):
        mark(px).save(os.path.join(folder, "ic_launcher.png"))
        mark(px, radius=0.5).save(os.path.join(folder, "ic_launcher_round.png"))
        fg = int(px * 108 / 48)  # adaptive foreground canvas is 108dp with a 72dp safe zone
        mark(fg, bg=False, scale=0.62).save(os.path.join(folder, "ic_launcher_foreground.png"))
os.makedirs(os.path.join(root, "build"), exist_ok=True)
mark(512).save(os.path.join(root, "build", "icon.png"))
mark(512).save(os.path.join(root, "public", "icon-512.png"))
print("icons written")
