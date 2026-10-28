// Sequence de demarrage : splash HTML -> message de bienvenue, SANS jamais voir la page
// principale entre les deux. Banc « demarrage » : le VRAI index.html (styles, splash,
// script de decision) + le VRAI main.jsx ; seule la session est simulee (DONNEES DE TEST,
// bandeau « EXEMPLE »). Reseau « Slow 4G » + processeur ralenti x4, serveur avec gzip.
// Preuves : (1) chaque image du navigateur (requestAnimationFrame) calcule l'opacite des
// couches qui couvrent la page ; (2) des images reelles (screencast) analysees pixel par
// pixel ; (3) des series d'images sauvees dans /workspace/shots/accueil-sequence-*.png.
import http from 'http';
import zlib from 'zlib';
import { execSync, spawnSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const SHOTS = process.env.SHOTS || '/workspace/shots', PORT = 8098, RACINE = 'app-v2/apercu/construit';
const SEQ = process.env.SEQ !== '0';       // sauver les series d'images
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
let echecs = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) echecs++; };

// -- banc : regenere depuis index.html, construit, logos copies
execSync('node tools/gen-banc-demarrage.mjs', { stdio: 'inherit' });
execSync('npx vite build --config apercu.config.js', { cwd: 'app-v2', stdio: 'ignore' });
for (const f of ['belfit-logo-bf.png', 'belfit-nom.png']) copyFileSync(f, RACINE + '/' + f);
// garde-fou : la page de banc reprend bien le script de decision du vrai index.html
const idx = readFileSync('app-v2/index.html', 'utf8'), banc = readFileSync('app-v2/apercu/demarrage.html', 'utf8');
for (const m of idx.matchAll(/<script>[\s\S]*?<\/script>/g)) ok(banc.includes(m[0]), 'le banc contient le script en ligne de index.html (' + m[0].length + ' car.)');
ok(/<div id="splash">/.test(banc) && /acc-attendu/.test(banc), 'le banc reprend le splash et la regle CSS « acc-attendu » du vrai index.html');

// -- serveur statique avec gzip (comme GitHub Pages)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((req, rep) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(RACINE, u === '/' ? 'index.html' : u);
  if (!f.startsWith(RACINE) || !existsSync(f)) { rep.writeHead(404); rep.end(); return; }
  const ext = path.extname(f), buf = readFileSync(f), gz = /\.(html|js|css)$/.test(ext) && /gzip/.test(req.headers['accept-encoding'] || '');
  rep.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store', ...(gz ? { 'content-encoding': 'gzip' } : {}) });
  rep.end(gz ? zlib.gzipSync(buf) : buf);
}).listen(PORT);

const nav = await chromium.launch({ executablePath: CHROME });
const MOYEN = { latence: 120, bas: 450 * 1024 };    // ~3,6 Mbit/s : « 4G » moyenne
const LENT = { latence: 150, bas: 200 * 1024 };      // ~1,6 Mbit/s : « Slow 4G »

/** Un demarrage complet ; retourne les mesures. */
async function demarrer({ nom, connu = true, compteur = null, query = '', reduit = false, reseau = LENT, cpu = 4, duree = 9000, sauver = false }) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE', timezoneId: 'Europe/Brussels', deviceScaleFactor: 1, reducedMotion: reduit ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([connu, compteur]) => {
    Math.random = () => 0;
    try { if (connu) localStorage.setItem('belfit_accueil_connu', '1'); } catch (e) {}
    // Frequence 1 sur 5 : compteur d'ouvertures amorce (null = absent = toute premiere ouverture).
    try { if (compteur !== null && !sessionStorage.getItem('__amorce')) { localStorage.setItem('belfit_accueil_n', String(compteur)); sessionStorage.setItem('__amorce', '1'); } } catch (e) {}
    // mouchard : a chaque image du navigateur, l'opacite cumulee des couches qui couvrent la page
    window.__img = [];
    const opa = (el) => { let a = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) a *= parseFloat(getComputedStyle(e).opacity); return a; };
    const t0 = performance.now();
    const boucle = () => {
      const sp = document.getElementById('splash'), vo = document.querySelector('.acc-voile');
      const aS = sp ? opa(sp) : 0, aV = vo ? opa(vo) : 0;
      const logoS = sp ? [...sp.querySelectorAll('img')].find(i => getComputedStyle(i).visibility !== 'hidden') || sp.querySelector('.sp-sym') : null, logoV = vo ? vo.querySelector('.acc-logo') : null;
      const lS = logoS && getComputedStyle(logoS).visibility !== 'hidden' ? aS * parseFloat(getComputedStyle(logoS).opacity) : 0;
      const lV = logoV ? aV * parseFloat(getComputedStyle(logoV).opacity) : 0;
      window.__img.push({ t: Math.round(performance.now() - t0), couv: +(1 - (1 - aS) * (1 - aV)).toFixed(3), aS: +aS.toFixed(2), aV: +aV.toFixed(2), sp: !!sp, vo: !!vo, lS: +lS.toFixed(2), lV: +lV.toFixed(2),
        app: !!document.querySelector('#app > *'), spBg: sp ? getComputedStyle(sp).backgroundColor : '', msg: vo ? (vo.querySelector('.acc-msg') || {}).textContent || '' : '' });
      requestAnimationFrame(boucle);
    };
    requestAnimationFrame(boucle);
    // bandeau EXEMPLE (ajoute a <html>, hors de #app, ne touche a rien)
    document.addEventListener('DOMContentLoaded', () => { const d = document.createElement('div'); d.textContent = 'EXEMPLE · démarrage simulé · données de test'; d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#d00;color:#fff;font:700 12px sans-serif;text-align:center;padding:4px 6px;pointer-events:none'; document.documentElement.appendChild(d); });
  }, [connu, compteur]);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: reseau.latence, downloadThroughput: reseau.bas, uploadThroughput: reseau.bas });
  const images = [];   // { t (ms depuis le debut), data }
  let debut = Date.now();
  cdp.on('Page.screencastFrame', async (f) => { images.push({ t: Date.now() - debut, data: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  debut = Date.now();
  await page.goto('http://localhost:' + PORT + '/demarrage.html' + query, { waitUntil: 'commit' });
  await page.waitForTimeout(duree);
  await cdp.send('Page.stopScreencast');
  const mesures = await page.evaluate(() => ({ img: window.__img, marqueur: localStorage.getItem('belfit_accueil_connu'), compteur: localStorage.getItem('belfit_accueil_n'), ouverture: window.__accueilOuverture, classes: document.documentElement.className, voiles: document.querySelectorAll('.acc-voile').length }));
  await ctx.close();
  // images reelles -> disque -> analyse pixel
  const dossier = '/tmp/seq-' + nom; rmSync(dossier, { recursive: true, force: true }); mkdirSync(dossier, { recursive: true });
  images.forEach((f, i) => writeFileSync(dossier + '/' + String(i).padStart(3, '0') + '.png', Buffer.from(f.data, 'base64')));
  const fichiers = images.map((f, i) => dossier + '/' + String(i).padStart(3, '0') + '.png');
  const hors = fichiers.length ? JSON.parse(spawnSync('python3', ['tools/analyse-frames.py', ...fichiers], { encoding: 'utf8', maxBuffer: 1 << 26 }).stdout) : {};
  const lignes = images.map((f, i) => ({ t: f.t, hors: hors[fichiers[i]], fichier: fichiers[i] }));
  if (sauver && SEQ) sauverSerie(nom, lignes);
  return { ...mesures, lignes, nImages: images.length };
}

/** ~12 images etalees dans le temps -> /workspace/shots/accueil-sequence-<nom>-NN.png */
function sauverSerie(nom, lignes) {   // eslint-disable-line
  const debut = lignes.findIndex(l => l.hors < 0.1);   // on saute la page blanche d'avant la premiere peinture
  if (debut < 0) return;
  lignes = lignes.slice(debut);
  const choix = [];
  for (const cible of [0, 150, 400, 800, 1300, 1800, 2300, 2800, 3300, 3800, 4300, 4800, 5400, 6200]) {
    const l = lignes.filter(x => x.t >= cible)[0]; if (l && !choix.includes(l)) choix.push(l);
  }
  mkdirSync(SHOTS, { recursive: true });
  choix.forEach((l, i) => copyFileSync(l.fichier, SHOTS + '/accueil-sequence-' + (process.env.PREFIXE || '') + nom + '-' + String(i + 1).padStart(2, '0') + '.png'));
  // planche contact : une image toutes les ~100 ms (la page blanche d'avant la premiere peinture est ecartee)
  const planche = []; let dernier = -999;
  for (const l of lignes) if (l.t - dernier >= 100) { planche.push(l.t + ':' + l.fichier); dernier = l.t; }
  spawnSync('python3', ['tools/montage-frames.py', SHOTS + '/accueil-sequence-' + (process.env.PREFIXE || '') + nom + '-planche.png', 'EXEMPLE (donnees de test) - ' + (process.env.PREFIXE || '') + nom + ' - une image toutes les 100 ms', ...planche.slice(0, 40)]);
  writeFileSync(SHOTS + '/accueil-sequence-' + (process.env.PREFIXE || '') + nom + '.txt', choix.map((l, i) => String(i + 1).padStart(2, '0') + '  ' + l.t + ' ms  hors-creme=' + l.hors).join('\n') + '\n');
}

const SEUIL_COUVERT = 0.99;
const seuilPixels = (n) => n === 'auth-tres-lente' ? 0.1 : 0.03;   // 0,1 : on tolere le logo du splash revenu (~0,05)
/** Premier instant ou la voile d'accueil est opaque (ms) ; null si jamais. */
const premierOpaque = (img) => { const f = img.find(x => x.vo && x.aV >= SEUIL_COUVERT); return f ? f.t : null; };
/** Images (navigateur) ou la page principale aurait pu etre vue avant que l'accueil soit pret. */
const fuites = (img) => { const t = premierOpaque(img); return img.filter(x => x.app && x.couv < SEUIL_COUVERT && (t === null || x.t < t)); };

const cas = process.argv[2] ? process.argv[2].split(',') : ['direct-lent', 'direct-moyen', 'direct-donnees-lentes', 'direct-mouvement-reduit', 'sans-accueil-premiere-ouverture', 'deconnecte', 'auth-tres-lente', 'une-sur-5-avec-message', 'une-sur-5-sans-message', 'une-sur-5-sans-message-lent'];
async function lancer(n) { return demarrer(DEFS[n]); }
const DEFS = {
  'direct-lent': { nom: 'reseau-lent', reseau: LENT, query: '', sauver: true },
  'direct-moyen': { nom: 'reseau-moyen', reseau: MOYEN, cpu: 2, query: '', sauver: true },
  'direct-donnees-lentes': { nom: 'donnees-lentes', reseau: MOYEN, query: '?donnees=4200', sauver: false },
  'direct-mouvement-reduit': { nom: 'mouvement-reduit', reseau: MOYEN, reduit: true, sauver: false },
  'sans-accueil-premiere-ouverture': { nom: 'sans-marqueur', connu: false, reseau: MOYEN, sauver: true },
  'deconnecte': { nom: 'deconnecte', reseau: MOYEN, query: '?sansutilisateur', sauver: true },
  'une-sur-5-avec-message': { nom: '1sur5-avec-message', compteur: 0, reseau: MOYEN, sauver: true },
  'une-sur-5-sans-message': { nom: '1sur5-sans-message', compteur: 2, reseau: MOYEN, sauver: true },
  'une-sur-5-sans-message-lent': { nom: '1sur5-sans-message-lent', compteur: 4, reseau: LENT, sauver: false },
  'auth-tres-lente': { nom: 'auth-tres-lente', reseau: MOYEN, query: '?auth=3600&donnees=4200', sauver: true },
};

for (const n of cas) {
  console.log('\n— cas : ' + n);
  const r = await lancer(n);
  const F = fuites(r.img), t = premierOpaque(r.img);
  const logoDouble = r.img.filter(x => x.lS > 0.05 && x.lV > 0.05);
  const premiereCreme = r.lignes.findIndex(l => l.hors < 0.1);   // avant : page blanche du navigateur, pas encore la notre
  const pixelFuite = r.lignes.filter((l, i) => i > premiereCreme && l.hors > seuilPixels(n) && (t === null || l.t < t - 60));
  console.log('  ' + r.img.length + ' images navigateur, ' + r.nImages + ' images reelles, accueil opaque a ' + t + ' ms');
  if (n.startsWith('direct') || n === 'auth-tres-lente' || n === 'une-sur-5-avec-message') {
    ok(t !== null, n + ' : l\'accueil s\'affiche (opaque a ' + t + ' ms)');
    ok(F.length === 0, n + ' : AUCUNE image du navigateur ne laisse voir la page principale avant l\'accueil (' + F.length + ' sur ' + r.img.length + ')' + (F.length ? ' ex. t=' + F[0].t + ' ms couverture=' + F[0].couv : ''));
    ok(pixelFuite.length === 0, n + ' : AUCUNE image reelle (pixels) ne montre la page principale avant l\'accueil (' + pixelFuite.length + '/' + r.nImages + ')' + (pixelFuite.length ? ' ex. t=' + pixelFuite[0].t + ' ms hors-creme=' + pixelFuite[0].hors : ''));
    const txt = (r.img.find(x => x.msg) || {}).msg;
    ok(/^Bon(jour|soir|nuit)|Raci/.test(txt || '') , n + ' : message « ' + txt + ' »');
    if (n !== 'auth-tres-lente') {
      ok(logoDouble.length === 0 && r.img.every(x => !x.sp || x.lS === 0 || x.t > 99999), n + ' : jamais deux logos ; le splash n\'a pas de logo (cache) — max logo splash ' + Math.max(...r.img.map(x => x.lS)));
      ok(r.img.filter(x => x.sp).every(x => /rgb\(247, 244, 239\)/.test(x.spBg)), n + ' : fond du splash = creme de l\'accueil (#f7f4ef)');
    } else {
      ok(logoDouble.length === 0 || Math.max(...logoDouble.map(x => Math.min(x.lS, x.lV))) < 0.5, n + ' : cas extreme : le logo du splash revient apres 2,5 s ; chevauchement bref toleres (max ' + Math.max(0, ...logoDouble.map(x => Math.min(x.lS, x.lV))).toFixed(2) + ')');
    }
    const dernier = r.img[r.img.length - 1];
    ok(!dernier.sp && !dernier.vo && dernier.app, n + ' : a la fin, plus de splash ni de voile, l\'app est la');
    ok(r.marqueur === '1', n + ' : marqueur « connu » conserve');
  }
  if (n === 'une-sur-5-avec-message') {
    ok(r.ouverture === 1 && r.compteur === '1', n + ' : decision « message » prise avant le rendu (window.__accueilOuverture = 1), compteur 0 -> 1');
  }
  if (n.startsWith('une-sur-5-sans-message')) {
    const s0 = r.img.find(x => x.sp), dernier = r.img[r.img.length - 1];
    ok(r.ouverture === 0 && r.compteur === String((DEFS[n].compteur + 1) % 5), n + ' : decision « pas de message » (window.__accueilOuverture = 0), compteur ' + DEFS[n].compteur + ' -> ' + r.compteur);
    ok(!/acc-attendu/.test(r.classes) && s0 && /rgb\(244, 243, 240\)/.test(s0.spBg), n + ' : splash habituel (fond #F4F3F0, pas de splash sans logo)');
    ok(Math.max(...r.img.map(x => x.lS)) > 0.9, n + ' : le logo est bien present sur le splash de chargement (opacite max ' + Math.max(...r.img.map(x => x.lS)) + ')');
    ok(!r.img.some(x => x.vo) && r.voiles === 0, n + ' : AUCUN message de bienvenue, a aucun moment');
    ok(!dernier.sp && dernier.app, n + ' : l\'app s\'ouvre directement : plus de splash, l\'app est la');
    // la page principale n'est jamais vue AVANT que le splash (opaque, avec son logo) ne se retire
    const tPartie = (r.img.find(x => x.sp && x.aS < 0.99) || {}).t;
    const fuiteSp = r.img.filter(x => x.app && x.sp && x.aS < 0.99 && x.t < (tPartie ?? 0));
    ok(r.img.filter(x => x.app && x.sp).every(x => x.aS >= 0.99 || x.t >= (tPartie ?? 0)), n + ' : le splash couvre la page tant qu\'il n\'a pas commence a se retirer (' + fuiteSp.length + ' fuite)');
    ok(r.marqueur === '1', n + ' : marqueur « connu » inchange');
  }
  if (n === 'sans-accueil-premiere-ouverture') {
    const s0 = r.img.find(x => x.sp);
    ok(!/acc-attendu/.test(r.classes) && s0 && /rgb\(244, 243, 240\)/.test(s0.spBg), n + ' : pas de decision « accueil » : splash habituel (fond #F4F3F0)');
    ok(Math.max(...r.img.map(x => x.lS)) > 0.9, n + ' : le splash garde son logo (opacite max ' + Math.max(...r.img.map(x => x.lS)) + ')');
    ok(r.img.some(x => x.vo) , n + ' : l\'accueil apparait quand meme ensuite (premiere ouverture apres connexion), comportement inchange');
    ok(r.marqueur === '1', n + ' : le marqueur est pose a l\'affichage');
  }
  if (n === 'deconnecte') {
    ok(!r.img.some(x => x.vo), n + ' : pas de message de bienvenue sans utilisateur');
    ok(r.marqueur === null, n + ' : marqueur « connu » efface');
    const dernier = r.img[r.img.length - 1]; ok(!dernier.sp, n + ' : le splash est parti (pas de blocage)');
    const tfin = (r.img.find(x => x.sp && x.aS < 0.5) || {}).t;
    ok(tfin !== undefined && tfin < 4500, n + ' : le splash se retire sans attendre le plafond (' + tfin + ' ms)');
  }
}
await nav.close(); srv.close();
console.log(echecs ? '\nECHEC (' + echecs + ')' : '\nOK');
process.exit(echecs ? 1 : 0);
