// Code de reduction, cote application : serveur SIMULE (aucune requete reelle, aucun vrai code).
// Les codes TEST15 / ANCIEN / ... n'existent que dans ce fichier. Bandeau « EXEMPLE » sur chaque capture.
// Depuis la racine : node tools/test-code-reduction-client.mjs
// Prerequis : cd app-v2 && npx vite build --config apercu.config.js
// Option : SHOTS=/workspace/shots pour garder les captures 390 px.
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8097;
const SHOTS = process.env.SHOTS || '';
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const APP = `http://localhost:${PORT}/app.html`;
const MSG = { inconnu: "Ce code n'existe pas. Vérifie la saisie (lettres et chiffres, sans espace).", utilise: 'Ce code a déjà été utilisé.' };
// Faux serveur : TEST15 (-15 %), TEST10 (-10 %), ANCIEN (deja utilise)
const CODES = { TEST15: 15, TEST10: 10, ANCIEN: 'utilise' };
const norm = (x) => String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const prix = (pc) => ({ base: '80.00', reduction: (80 * pc / 100).toFixed(2), montant: (80 - 80 * pc / 100).toFixed(2) });
const serveur = (opts = {}) => (nom, corps) => {
  if (nom === 'mollieEtat') return { status: 200, body: { ok: true, autorise: true, mode: 'test' } };
  if (nom === 'verifierCodeReduction') {
    const c = norm(corps.code); const v = CODES[c];
    if (!c) return { status: 400, body: { ok: false, motif: 'vide', message: 'Saisis ton code de réduction.' } };
    if (v === undefined) return { status: 404, body: { ok: false, motif: 'inconnu', message: MSG.inconnu } };
    if (v === 'utilise') return { status: 409, body: { ok: false, motif: 'utilise', message: MSG.utilise } };
    return { status: 200, body: { ok: true, code: c, pourcent: v, ...prix(v) } };
  }
  if (nom === 'creerPaiementMollie') {
    if (opts.refusePaiement) return { status: 409, body: { ok: false, motif: 'utilise', message: MSG.utilise } };
    return { status: 200, body: { ok: true, url: 'https://mollie.test/checkout/tr_test' } };
  }
  return { status: 404, body: {} };
};
async function page(srvSim) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000); p.appels = [];
  p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
  await ctx.route(/cloudfunctions\.net/, async route => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } });
    const nom = req.url().split('/').pop(); const corps = JSON.parse(req.postData() || '{}');
    p.appels.push({ nom, corps, auth: req.headers().authorization });
    const rep = srvSim(nom, corps);
    await route.fulfill({ status: rep.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(rep.body) });
  });
  await ctx.route('https://mollie.test/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Page Mollie (simulee)</h1>' }));
  await p.goto(APP); await p.evaluate(() => localStorage.clear()); p.appels.length = 0;
  await p.goto(APP); await p.waitForTimeout(1800);
  await p.locator('.bn-item').last().tap(); await p.waitForTimeout(700);
  return p;
}
const shot = async (p, nom, cible = '.cp-offre') => {
  if (!SHOTS) return;
  await p.evaluate(([c]) => {
    const e = document.querySelector(c); if (e) e.scrollIntoView({ block: 'center' });
    let b = document.getElementById('etiq-exemple');
    if (!b) { b = document.createElement('div'); b.id = 'etiq-exemple'; b.textContent = 'EXEMPLE · codes et serveur simulés · aucun paiement réel'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:3px'; document.body.appendChild(b); }
  }, [cible]);
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${SHOTS}/code-reduction-${nom}.png` });
};
const saisir = async (p, texte) => { const ch = p.locator('#cp-code-champ'); await ch.fill(texte); await p.locator('.cp-code-bt').tap(); await p.waitForTimeout(500); };
try {
  let p = await page(serveur());
  ok(await p.locator('.cp-offre .cp-prix').innerText() === '80 €', 'champ vide : prix 80 €');
  ok(await p.locator('.cp-code-lib').innerText() === 'Code de réduction' && await p.locator('#cp-code-champ').count() === 1, 'le champ « Code de réduction » est sous le prix, dans la carte de l\'offre');
  ok(await p.locator('.cp-code-bt').isDisabled(), 'champ vide : « Appliquer » désactivé');
  const hauteurs = await p.evaluate(() => ['#cp-code-champ', '.cp-code-bt'].map(s => document.querySelector(s).getBoundingClientRect().height));
  ok(hauteurs.every(h => h >= 44), 'zones à toucher d\'au moins 44 px');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'pas de débordement horizontal à 390 px');
  await shot(p, '1-vide');

  await saisir(p, ' test 15 ');
  ok(/−15\s%\sappliqué/.test(await p.locator('.cp-code-ok').innerText()) && /68\s€/.test(await p.locator('.cp-code-ok').innerText()), 'code valide : « −15 % appliqué », 68 €');
  ok(await p.locator('.cp-offre .cp-prix').innerText() === '68 €' && await p.locator('.cp-prix-barre').innerText() === '80 €', 'prix affiché : 80 € barré, 68 €');
  const v = p.appels.find(a => a.nom === 'verifierCodeReduction');
  ok(v && v.corps.type === 'plan' && /^Bearer /.test(v.auth) && !('montant' in v.corps), 'vérification : type « plan », jeton, aucun montant envoyé');
  await shot(p, '2-valide-15');

  await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).tap(); await p.waitForTimeout(300);
  const m = p.locator('.cp-modale');
  ok(/Premier mois · 68 € \(au lieu de 80 €\)/.test(await m.innerText()), 'fenêtre de paiement : « Premier mois · 68 € (au lieu de 80 €) »');
  await m.locator('.cp-oui-non').nth(0).locator('.qc-chip', { hasText: 'Oui' }).tap();
  await m.locator('.cp-oui-non').nth(1).locator('.qc-chip', { hasText: 'Non' }).tap();
  await m.locator('.cp-consent input').nth(0).check(); await m.locator('.cp-consent input').nth(1).check();
  await shot(p, '5-fenetre-paiement', '.cp-modale');
  await m.locator('.cp-bt--or', { hasText: 'paiement' }).tap(); await p.waitForTimeout(800);
  const cree = p.appels.find(a => a.nom === 'creerPaiementMollie');
  ok(cree && cree.corps.type === 'plan' && cree.corps.code === 'TEST15' && !('montant' in cree.corps) && !('amount' in cree.corps) && !('pourcent' in cree.corps), 'paiement : on envoie type + code normalisé, jamais de montant ni de pourcentage');
  ok(/mollie\.test/.test(p.url()), 'envoyé vers la page de paiement (simulée)');
  await p.context().close();

  p = await page(serveur());
  await saisir(p, 'TEST15');
  await p.locator('.cp-code-lien').tap(); await p.waitForTimeout(200);
  ok(await p.locator('.cp-offre .cp-prix').innerText() === '80 €' && await p.locator('#cp-code-champ').count() === 1, '« Retirer » : retour à 80 € et au champ vide');
  await saisir(p, 'MAUVAIS');
  ok(/n'existe pas/.test(await p.locator('.cp-code-err').innerText()) && await p.locator('.cp-offre .cp-prix').innerText() === '80 €', 'code invalide : message clair, prix inchangé');
  ok(await p.locator('.cp-code-err').getAttribute('role') === 'alert' && await p.locator('#cp-code-champ').getAttribute('aria-invalid') === 'true', 'erreur annoncée aux lecteurs d\'écran (role=alert, aria-invalid)');
  await shot(p, '3-invalide');
  await saisir(p, 'ancien');
  ok(/déjà été utilisé/.test(await p.locator('.cp-code-err').innerText()), 'code déjà utilisé : message clair');
  await shot(p, '4-deja-utilise');
  await p.locator('#cp-code-champ').fill('x'); await p.waitForTimeout(100);
  ok(await p.locator('.cp-code-err').count() === 0, 'l\'erreur disparaît dès qu\'on retape');
  // paiement sans code : comme avant
  await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).tap(); await p.waitForTimeout(300);
  const m2 = p.locator('.cp-modale');
  ok(/Premier mois · 80 €/.test(await m2.innerText()) && !/au lieu de/.test(await m2.innerText()), 'sans code : « Premier mois · 80 € » comme avant');
  await m2.locator('.cp-oui-non').nth(0).locator('.qc-chip', { hasText: 'Oui' }).tap();
  await m2.locator('.cp-oui-non').nth(1).locator('.qc-chip', { hasText: 'Non' }).tap();
  await m2.locator('.cp-consent input').nth(0).check(); await m2.locator('.cp-consent input').nth(1).check();
  await m2.locator('.cp-bt--or', { hasText: 'paiement' }).tap(); await p.waitForTimeout(800);
  const c2 = p.appels.find(a => a.nom === 'creerPaiementMollie');
  ok(c2 && !('code' in c2.corps), 'sans code : aucun « code » envoyé');
  await p.context().close();

  // Le serveur refuse au moment de payer (code pris entre-temps) : retour au champ, pas de redirection
  p = await page(serveur({ refusePaiement: true }));
  await saisir(p, 'TEST10');
  await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).tap(); await p.waitForTimeout(300);
  const m3 = p.locator('.cp-modale');
  await m3.locator('.cp-oui-non').nth(0).locator('.qc-chip', { hasText: 'Oui' }).tap();
  await m3.locator('.cp-oui-non').nth(1).locator('.qc-chip', { hasText: 'Non' }).tap();
  await m3.locator('.cp-consent input').nth(0).check(); await m3.locator('.cp-consent input').nth(1).check();
  await m3.locator('.cp-bt--or', { hasText: 'paiement' }).tap(); await p.waitForTimeout(800);
  ok(!/mollie\.test/.test(p.url()) && /déjà été utilisé/.test(await p.locator('.cp-code-err').innerText()) && await p.locator('.cp-modale').count() === 0 && await p.locator('.cp-offre .cp-prix').innerText() === '80 €', 'refus du serveur au paiement : fenêtre fermée, message sous le champ, prix remis à 80 €, aucun paiement');
  await p.context().close();


  // 28/10 — client EXISTANT qui reprend un mois a 80 € (apres la fenetre des 60 €) : il peut utiliser un code
  {
    const jours = (n) => new Date(Date.now() - n * 86400000).toISOString();
    const PLAN = { kcal: 2100, prot: 150, carbs: 220, lip: 70, livreLe: jours(60), version: 1, repas: [{ nom: 'Déjeuner', ings: [{ name: 'Riz', portion: 150 }] }] };
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE' });
    await ctx.addInitScript(([pl, d]) => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl)); localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d)); },
      [PLAN, { commande: { payeLe: jours(60), type: 'plan' }, questionnaire: { envoyeLe: jours(59) } }]);
    const sim = serveur(); const p = await ctx.newPage(); p.setDefaultTimeout(8000); p.appels = [];
    p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
    await ctx.route(/cloudfunctions\.net/, async route => {
      const req = route.request();
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } });
      const nom = req.url().split('/').pop(); const corps = JSON.parse(req.postData() || '{}'); p.appels.push({ nom, corps });
      const rep = sim(nom, corps); await route.fulfill({ status: rep.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(rep.body) });
    });
    await ctx.route('https://mollie.test/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Page Mollie (simulee)</h1>' }));
    await p.goto(APP + '?onglet=premium'); await p.waitForTimeout(2200);
    await p.getByText('Mon suivi', { exact: true }).first().click(); await p.waitForTimeout(700);
    await p.locator('.cp-bt--or', { hasText: 'Reprendre · 80 €' }).tap(); await p.waitForTimeout(400);
    const mr = p.locator('.cp-modale');
    ok(/Nouveau mois · 80 €/.test(await mr.innerText()) && await mr.locator('#cp-code-champ-modale').count() === 1, 'client existant, « Reprendre · 80 € » : la fenêtre propose le champ « Code de réduction »');
    await mr.locator('#cp-code-champ-modale').fill('test15'); await mr.locator('.cp-code-bt').tap(); await p.waitForTimeout(500);
    ok(/Nouveau mois · 68 € \(au lieu de 80 €\)/.test(await mr.innerText()) && /−15\s%\sappliqué/.test(await mr.innerText()), 'code appliqué : « Nouveau mois · 68 € (au lieu de 80 €) »');
    ok(p.appels.some(a => a.nom === 'verifierCodeReduction' && a.corps.type === 'plan'), 'vérification côté serveur : type « plan »');
    await shot(p, 'rachat-80-avec-code', '.cp-modale');
    await mr.locator('.cp-oui-non').nth(0).locator('.qc-chip', { hasText: 'Oui' }).tap();
    await mr.locator('.cp-oui-non').nth(1).locator('.qc-chip', { hasText: 'Non' }).tap();
    await mr.locator('.cp-consent input').nth(0).check(); await mr.locator('.cp-consent input').nth(1).check();
    await mr.locator('.cp-bt--or', { hasText: 'paiement' }).tap(); await p.waitForTimeout(800);
    const cr = p.appels.find(a => a.nom === 'creerPaiementMollie');
    ok(cr && cr.corps.type === 'plan' && cr.corps.code === 'TEST15' && !('montant' in cr.corps), 'rachat : le code part avec le paiement à 80 € (type plan), jamais de montant');
    await ctx.close();
  }
  // Mise a jour a 60 € : jamais de champ de code
  {
    const jours = (n) => new Date(Date.now() - n * 86400000).toISOString();
    const PLAN = { kcal: 2100, prot: 150, carbs: 220, lip: 70, livreLe: jours(26), version: 1, repas: [{ nom: 'Déjeuner', ings: [{ name: 'Riz', portion: 150 }] }] };
    const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
    await ctx.addInitScript(([pl, d]) => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl)); localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d)); },
      [PLAN, { commande: { payeLe: jours(27), type: 'plan' }, questionnaire: { envoyeLe: jours(26) } }]);
    const sim = serveur(); const p = await ctx.newPage(); p.setDefaultTimeout(8000);
    await ctx.route(/cloudfunctions\.net/, async route => {
      const req = route.request();
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } });
      const rep = sim(req.url().split('/').pop(), JSON.parse(req.postData() || '{}')); await route.fulfill({ status: rep.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(rep.body) });
    });
    await p.goto(APP + '?onglet=premium'); await p.waitForTimeout(2200);
    await p.getByText('Mon suivi', { exact: true }).first().click(); await p.waitForTimeout(700);
    const lien = p.locator('.sv-lien', { hasText: '60 €' });
    ok(await lien.count() === 1, 'fenêtre des 60 € : le lien « Le mois suivant est à 60 € » est là');
    await lien.first().tap(); await p.waitForTimeout(400);
    const m60 = p.locator('.cp-modale');
    ok(/Mois suivant · 60 €/.test(await m60.innerText()) && await m60.locator('input[id^="cp-code-champ"]').count() === 0, 'mise à jour à 60 € : aucun champ « Code de réduction »');
    await ctx.close();
  }
  // Compte non autorise : pas de champ du tout
  p = await page((nom) => nom === 'mollieEtat' ? { status: 200, body: { ok: true, autorise: false, mode: 'test' } } : { status: 404, body: {} });
  ok(await p.locator('#cp-code-champ').count() === 0 && await p.locator('.cp-code').count() === 0, 'paiement fermé : pas de champ de code');
  await p.context().close();
} catch (e) { console.error(e); code = 1; }
await nav.close(); try { process.kill(-srv.pid); } catch (e) { /* rien */ }
console.log(code ? '\nÉCHEC' : '\nOK'); process.exit(code);
