#!/usr/bin/env python3
"""Pour chaque image : part des pixels qui ne sont NI creme NI (logo/texte de l'accueil)
dans la zone centrale. Une page principale (cadran, cartes, boutons) en a beaucoup ;
l'accueil (un mot sur fond creme) en a tres peu. Usage : analyse-frames.py img1 img2 ..."""
import sys, json
from PIL import Image
CREMES = [(0xf7, 0xf4, 0xef), (0xf4, 0xf3, 0xf0)]
res = {}
for p in sys.argv[1:]:
    im = Image.open(p).convert('RGB')
    w, h = im.size
    # on ignore le bandeau EXEMPLE (bas) et la bande du logo (haut)
    zone = im.crop((0, 100, w, h - 50)); px = zone.load(); zw, zh = zone.size
    hors = 0; n = 0
    for y in range(0, zh, 3):
        for x in range(0, zw, 3):
            r, g, b = px[x, y]; n += 1
            if not any(abs(r - c[0]) <= 7 and abs(g - c[1]) <= 7 and abs(b - c[2]) <= 7 for c in CREMES): hors += 1
    res[p] = round(hors / n, 4)
print(json.dumps(res))
