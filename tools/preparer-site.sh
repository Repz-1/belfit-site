#!/usr/bin/env bash
# Prepare le dossier _site/ publie sur GitHub Pages (audit v658).
# LISTE BLANCHE : seul ce qui est nomme ici est publie. Avant, tout le
# depot partait en ligne (functions/, firestore.rules, notes internes,
# android/, outils...). A lancer APRES le build de app-v2 (-> v2/).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf _site && mkdir -p _site
# Pages publiques (index-redirect-v2.html est un brouillon interne)
for f in index.html cgv.html confidentialite.html mentions-legales.html \
         coach.html verification.html reinitialisation.html \
         suppression-compte.html plans.html; do
  [ -f "$f" ] && cp "$f" _site/
done
cp *.png sw.js i18n.js i18n-strings.js manifest.json CNAME robots.txt sitemap.xml _site/
cp -r img fonts v2 .well-known _site/
[ -d __ ] && cp -r __ _site/
# coach.html importe ces deux modules a l'execution (sans dependances)
mkdir -p _site/app-v2/src/data _site/app-v2/src/store
cp app-v2/src/data/aliments.js _site/app-v2/src/data/
cp app-v2/src/store/plans-par-date.js _site/app-v2/src/store/
# Anciennes adresses : redirigees vers l'app au lieu d'anciens builds
redir() {
  mkdir -p "_site/$1"
  cat > "_site/$1/index.html" <<HTML
<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=/v2/">
<link rel="canonical" href="https://www.belfit.be/v2/">
<title>BELFIT</title></head><body><a href="/v2/">Ouvrir BELFIT</a>
<script>location.replace('/v2/'+location.search+location.hash)</script></body></html>
HTML
}
redir app-v2; redir essai; redir dist
echo "_site pret : $(find _site -type f | wc -l) fichiers"
