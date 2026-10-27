#!/usr/bin/env python3
"""Planche contact : montage-frames.py sortie.png titre  t1:img1 t2:img2 ..."""
import sys
from PIL import Image, ImageDraw
out, titre, items = sys.argv[1], sys.argv[2], sys.argv[3:]
cols, ech = 8, 0.3
ims = []
for it in items:
    t, f = it.split(':', 1); im = Image.open(f).convert('RGB'); im = im.resize((int(im.width * ech), int(im.height * ech))); ims.append((t, im))
w, h = ims[0][1].size; rows = (len(ims) + cols - 1) // cols
fond = Image.new('RGB', (cols * (w + 6) + 6, rows * (h + 22) + 34), (40, 40, 40)); d = ImageDraw.Draw(fond)
d.text((8, 8), titre, fill=(255, 255, 255))
for i, (t, im) in enumerate(ims):
    x, y = 6 + (i % cols) * (w + 6), 30 + (i // cols) * (h + 22)
    fond.paste(im, (x, y)); d.text((x + 2, y + h + 4), t + ' ms', fill=(255, 220, 120))
fond.save(out)
