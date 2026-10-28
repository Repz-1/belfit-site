// Fabrique la page de banc « demarrage » a partir du VRAI index.html : memes
// styles, meme splash, memes scripts en ligne (dont la decision d'accueil). Seules
// la police externe et l'entree JS changent. Ainsi le test de demarrage ne peut
// pas deriver de la page de production.
import { readFileSync, writeFileSync } from 'fs';
const src = readFileSync('app-v2/index.html', 'utf8');
const prendre = (re) => [...src.matchAll(re)].map(m => m[0]);
const styles = prendre(/<style>[\s\S]*?<\/style>/g);
const scripts = prendre(/<script>[\s\S]*?<\/script>/g);   // non-module
const metas = prendre(/<meta name="(?:viewport|theme-color)"[^>]*>/g);
const corps = src.slice(src.indexOf('<body>') + 6, src.indexOf('<div id="app">'));
const sortie = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
${metas.join('\n')}
${styles.join('\n')}
${scripts.filter(s => !/<body/.test(s)).join('\n')}
</head>
<body>
${corps.replace(/<script>[\s\S]*?<\/script>/g, '')}
<div id="app"></div>
<script type="module" src="./demarrage.jsx"></script>
</body></html>
`;
writeFileSync('app-v2/apercu/demarrage.html', sortie);
console.log('banc demarrage : ' + sortie.length + ' octets, ' + scripts.length + ' script(s) en ligne repris de index.html');
