// Mode app Android (TWA Google Play, v643). Depuis la racine : node tools/test-app-android.mjs
// Prerequis : apercu construit (npx vite build --config apercu.config.js dans app-v2).
// Verifie qu'avec ?source=twa (ou le referrer android-app://be.belfit.app) aucun prix,
// bouton d'achat, code de reduction ni lien de paiement n'apparait, et que le web
// normal est inchange. SHOTS=dossier : captures d'ecran.
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const RACINE = 'app-v2/apercu/construit';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = createServer((q, r) => {
  let f = join(RACINE, decodeURIComponent(q.url.split('?')[0]));
  if (!existsSync(f) || f.endsWith('/')) f = join(f, 'index.html');
  if (!existsSync(f)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f));
}).listen(0);
const PORT = srv.address().port;
const SHOTS = process.env.SHOTS;
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const PRIX = /\d\s?(€|euros?)\b|€\s?\d/i;
const ACHAT = /Demander mon plan|S'ABONNER|Reprendre ·|Voir l'offre|Code de réduction|Continuer vers le paiement|Paiement sécurisé|Mollie|virement|IBAN|TARIFS|Bientôt disponible/i;
async function ouvrir(query, { plan = null, referrer = null } = {}) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE', deviceScaleFactor: 2 });
  if (referrer) await ctx.addInitScript(r => { Object.defineProperty(Document.prototype, 'referrer', { get: () => r }); }, referrer);
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
  await p.goto(`http://localhost:${PORT}/app.html${query}`);
  await p.evaluate(pl => { if (pl) localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl)); else localStorage.removeItem('belfit_v2_apercu_programme'); }, plan);
  await p.reload(); await p.waitForTimeout(1800);
  // Pire cas : paiement en ligne ouvert (compte autorise) et commandes ouvertes (?cmd=1).
  await p.evaluate(() => { window.__banc.paiementOuvert.value = true; }); await p.waitForTimeout(300);
  return p;
}
const coach = async p => { await p.locator('.bn-item').last().tap(); await p.waitForTimeout(900); return p.locator('#app').innerText(); };
const liensPaiement = p => p.evaluate(() => [...document.querySelectorAll('a[href], form[action]')].map(a => a.href || a.action).filter(h => /mollie|checkout|lemonsqueezy|paiement|payment|plans\.html|coach\.html|cgv\.html/i.test(h)));
const shot = (p, n) => SHOTS ? p.screenshot({ path: `${SHOTS}/${n}.png` }) : null;
try {
  // 1. Web normal : inchange.
  let p = await ouvrir('?cmd=1');
  let t = await coach(p);
  ok(/80 €/.test(t) && /Demander mon plan/.test(t), 'web : offre 80 € et « Demander mon plan » toujours la');
  ok(!(await p.evaluate(() => document.documentElement.classList.contains('app-android'))), 'web : pas de classe app-android');
  await shot(p, '0-web-coach'); await p.context().close();

  // 2. TWA (?source=twa), sans plan.
  p = await ouvrir('?source=twa&cmd=1');
  t = await coach(p);
  ok(!PRIX.test(t), 'twa : aucun prix dans l\'onglet Coach');
  ok(!ACHAT.test(t), 'twa : aucun bouton ni mot d\'achat dans l\'onglet Coach');
  ok(/Ton programme n'est pas encore actif\./.test(t), 'twa : message neutre affiche');
  ok((await liensPaiement(p)).length === 0, 'twa : aucun lien de paiement dans la page');
  ok(await p.locator('.cp-modale').count() === 0 && await p.locator('.cp-code').count() === 0, 'twa : ni fenetre d\'achat ni code de reduction');
  await shot(p, '1-twa-coach-sans-acces');
  // Memorise pour la session : rechargement sans le parametre.
  await p.goto(`http://localhost:${PORT}/app.html?cmd=1`); await p.waitForTimeout(1800);
  await p.evaluate(() => { window.__banc.paiementOuvert.value = true; });
  t = await coach(p);
  ok(!PRIX.test(t) && /pas encore actif/.test(t), 'twa : mode garde apres navigation sans ?source=twa (sessionStorage)');
  await p.context().close();

  // 3. TWA detectee par le referrer android-app://be.belfit.app.
  p = await ouvrir('?cmd=1', { referrer: 'android-app://be.belfit.app/' });
  t = await coach(p);
  ok(!PRIX.test(t) && /pas encore actif/.test(t), 'twa (referrer) : message neutre, aucun prix');
  await p.context().close();

  // 4. TWA, client avec un ancien plan (mois termine) : Mon suivi sans 60 € ni « Reprendre · 80 € ».
  const vieux = new Date(Date.now() - 50 * 86400000).toISOString();
  const plan = { kcal: 2400, prot: 180, carbs: 250, lip: 70, livreLe: vieux, repas: [{ nom: 'Petit dejeuner', ings: [{ name: 'Skyr', portion: 200 }] }] };
  p = await ouvrir('?source=twa&cmd=1', { plan });
  t = await coach(p);
  const onglets = p.locator('.prog-onglets [role=tab]');
  for (let i = 0; i < await onglets.count(); i++) {
    await onglets.nth(i).tap(); await p.waitForTimeout(500);
    const ti = await p.locator('#app').innerText();
    const nom = (await onglets.nth(i).innerText()).trim();
    ok(!PRIX.test(ti) && !ACHAT.test(ti), `twa avec plan : onglet « ${nom} » sans prix ni achat`);
    await shot(p, `2-twa-coach-avec-plan-${i}`);
  }
  await p.context().close();

  // 5. Alimentation verrouillee (pas d'acces) : carte neutre, sans « Voir l'offre ».
  p = await ouvrir('?verrou=jamais&cmd=1');
  ok(/Voir l'offre/.test(await p.locator('#app').innerText()), 'web : alimentation verrouillee propose « Voir l\'offre »');
  await p.context().close();
  p = await ouvrir('?source=twa&verrou=jamais&cmd=1');
  t = await p.locator('#app').innerText();
  ok(/pas encore actif/.test(t) && !ACHAT.test(t) && !PRIX.test(t), 'twa : alimentation verrouillee neutre, sans offre ni prix');
  await shot(p, '3-twa-alimentation-verrouillee');
  // Tous les onglets : aucun prix.
  const items = p.locator('.bn-item');
  for (let i = 0; i < await items.count(); i++) {
    await items.nth(i).tap(); await p.waitForTimeout(700);
    const ti = await p.locator('#app').innerText();
    ok(!PRIX.test(ti) && !ACHAT.test(ti), `twa : onglet ${i + 1} sans prix ni achat`);
    ok((await liensPaiement(p)).length === 0, `twa : onglet ${i + 1} sans lien de paiement`);
  }
  await p.context().close();
} catch (e) { ok(false, e.message.split('\n')[0]); }
await nav.close(); srv.close();
process.exit(code);
