#!/usr/bin/env python3
# Images des notifications (28/11, Raci : style « 1 » — degrade creme ->
# jaune -> peche, logo BF dans un rond blanc, trois petits points).
# Ecrit app-v2/public/notif/ : plan, entrainement, questionnaire, message
# (1024 x 512, grande image Android), icone (192) et badge (96, blanc
# sur transparent : la petite icone de la barre d'etat).
#   python3 tools/images-notifs.py /chemin/vers/satoshi-dossier-ttf
import os, sys
from PIL import Image, ImageDraw, ImageFont

FNT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/fnt'
SORTIE = os.path.join(os.path.dirname(__file__), '..', 'app-v2', 'public', 'notif')
os.makedirs(SORTIE, exist_ok=True)
NOIR, ORANGE, JAUNE = (21, 21, 21), (248, 106, 12), (250, 196, 8)
CREME, JAUNE_DOUX, PECHE = (248, 242, 232), (252, 231, 166), (251, 211, 179)
f = lambda poids, taille: ImageFont.truetype(os.path.join(FNT, 's%s.ttf' % poids), taille)

def degrade(w, h, arrets):
    """Degrade en biais (120 deg) entre des arrets [(position, couleur)]."""
    im = Image.new('RGB', (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            t = (x / w) * 0.8 + (y / h) * 0.2
            for (p0, c0), (p1, c1) in zip(arrets, arrets[1:]):
                if t <= p1:
                    k = (t - p0) / (p1 - p0) if p1 > p0 else 0
                    px[x, y] = tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
                    break
            else:
                px[x, y] = arrets[-1][1]
    return im

def logo(d, cx, cy, r, fond=(255, 255, 255), bord=(247, 227, 184), b=NOIR, fl=ORANGE):
    d.ellipse((cx - r - 5, cy - r - 5, cx + r + 5, cy + r + 5), fill=bord)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fond)
    police = f('900', int(r * 0.95))
    wb = d.textlength('B', font=police); wf = d.textlength('F', font=police)
    x0 = cx - (wb + wf - r * 0.04) / 2
    d.text((x0, cy), 'B', font=police, fill=b, anchor='lm')
    d.text((x0 + wb - r * 0.04, cy), 'F', font=police, fill=fl, anchor='lm')

ARRETS = {
    'plan': [(0, CREME), (0.6, JAUNE_DOUX), (1, PECHE)],
    'entrainement': [(0, CREME), (0.55, JAUNE_DOUX), (1, PECHE)],
    'questionnaire': [(0, CREME), (0.55, (251, 217, 188)), (1, JAUNE_DOUX)],
    'message': [(0, CREME), (0.5, (243, 235, 221)), (1, JAUNE_DOUX)],
}
TEXTES = {
    'plan': ('Plan reçu', 'Ta semaine t\'attend'),
    'entrainement': ('Programme reçu', 'Tes séances t\'attendent'),
    'questionnaire': ('Questionnaire', 'Quelques minutes, et c\'est parti'),
    'message': ('Mot du coach', 'Ouvre pour le lire'),
}
POINTS = {'plan': [ORANGE, JAUNE, (255, 255, 255)], 'entrainement': [ORANGE, JAUNE, (255, 255, 255)],
          'questionnaire': [JAUNE, ORANGE, (255, 255, 255)], 'message': [NOIR, JAUNE, (255, 255, 255)]}

for nom, arrets in ARRETS.items():
    W, H = 1024, 512
    im = degrade(W, H, arrets)
    d = ImageDraw.Draw(im)
    if nom == 'message':
        logo(d, 300, 256, 92, fond=NOIR, bord=JAUNE, b=CREME, fl=JAUNE)
    else:
        logo(d, 300, 256, 92)
    titre, sous = TEXTES[nom]
    d.text((436, 236), titre, font=f('700', 64), fill=NOIR, anchor='ls')
    d.text((438, 300), sous, font=f('500', 34), fill=(110, 80, 30), anchor='ls')
    for i, c in enumerate(POINTS[nom]):
        x = 442 + i * 34
        d.ellipse((x, 336, x + 18, 354), fill=c)
    im.save(os.path.join(SORTIE, nom + '.png'), optimize=True)

# Icone (grande icone a droite de la notification)
ic = degrade(192, 192, ARRETS['plan'])
m = Image.new('L', (192, 192), 0); ImageDraw.Draw(m).ellipse((0, 0, 191, 191), fill=255)
fond = Image.new('RGBA', (192, 192), (0, 0, 0, 0)); fond.paste(ic, (0, 0), m)
logo(ImageDraw.Draw(fond), 96, 96, 70)
fond.save(os.path.join(SORTIE, 'icone.png'), optimize=True)

# Badge : Android n'en garde que la forme (blanc sur transparent).
bd = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
dd = ImageDraw.Draw(bd)
dd.ellipse((4, 4, 92, 92), outline=(255, 255, 255, 255), width=7)
dd.text((48, 50), 'BF', font=f('900', 40), fill=(255, 255, 255, 255), anchor='mm')
bd.save(os.path.join(SORTIE, 'badge.png'), optimize=True)
print('Images ecrites dans', os.path.abspath(SORTIE))
