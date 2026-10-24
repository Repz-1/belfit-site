// Test client du paiement Mollie (24/10) : serveur simule, aucune requete reelle.
// Depuis la racine : node tools/test-mollie-client.mjs
// Prerequis : apercu construit (cd app-v2 && npx vite build --config apercu.config.js)
// Option : SHOTS=/workspace/shots pour garder des captures 390 px (donnees de test).
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8096;
const SHOTS = process.env.SHOTS || '';
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const APP = `http://localhost:${PORT}/app.html`;
const RETOUR = `${APP}?onglet=premium&coach=questionnaire&type=plan`;
// srv = { etat: {status, body}, retour: {...}, appels: [] }
async function page(srvSim, url) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.appels = [];

  p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
  await ctx.route(/cloudfunctions\.net/, async route => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } });
    const nom = req.url().split('/').pop();
    const corps = JSON.parse(req.postData() || '{}');
    p.appels.push({ nom, corps, auth: req.headers().authorization });
    const rep = srvSim(nom, corps);
    await route.fulfill({ status: rep.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(rep.body) });
  });
  await ctx.route('https://mollie.test/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Page Mollie (simulee)</h1>' }));
  await p.goto(APP);
  await p.evaluate(() => localStorage.clear());
  p.appels.length = 0;
  await p.goto(url || APP); await p.waitForTimeout(1800);
  if (!url || !/coach=/.test(url)) { await p.locator('.bn-item').last().tap(); await p.waitForTimeout(700); }
  return p;
}
const shot = async (p, nom) => {
  if (!SHOTS) return;
  await p.evaluate((n) => {
    const e = document.querySelector('.cp-offre'); if (e && /-coach$/.test(n)) e.scrollIntoView({ block: 'center' });
    let b = document.getElementById('etiq-test');
    if (!b) { b = document.createElement('div'); b.id = 'etiq-test'; b.textContent = 'DONNÉES DE TEST · serveur simulé'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:2px'; document.body.appendChild(b); }
  }, nom);
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${SHOTS}/${nom}.png` });
};
const refuse = () => ({ status: 200, body: { ok: true, autorise: false, mode: 'test' } });
const permis = (retour) => (nom, corps) => {
  if (nom === 'mollieEtat') return corps.retour ? { status: 200, body: { ok: true, autorise: true, mode: 'test', paiement: retour } } : { status: 200, body: { ok: true, autorise: true, mode: 'test' } };
  if (nom === 'creerPaiementMollie') return { status: 200, body: { ok: true, url: 'https://mollie.test/checkout/tr_test' } };
  return { status: 404, body: {} };
};
try {
  // 1) Compte NON autorise : rien ne change
  let p = await page((nom) => nom === 'mollieEtat' ? refuse() : { status: 404, body: {} });
  ok(await p.locator('.cp-bt', { hasText: 'Bientôt disponible' }).isDisabled(), 'non autorisé : « Bientôt disponible » désactivé');
  ok(await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).count() === 0, 'non autorisé : pas de bouton Payer');
  ok(p.appels.length === 1 && p.appels[0].nom === 'mollieEtat' && /^Bearer /.test(p.appels[0].auth), 'non autorisé : une seule question au serveur, avec le jeton');
  await shot(p, 'mollie-non-autorise-coach'); await p.context().close();

  // 2) Serveur en erreur (401) : meme comportement
  p = await page(() => ({ status: 401, body: { ok: false, autorise: false } }));
  ok(await p.locator('.cp-bt', { hasText: 'Bientôt disponible' }).count() === 1 && await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).count() === 0, '401 : « Bientôt disponible »');
  await p.context().close();

  // 3) Compte autorise : bouton actif, mode test, creation du paiement
  p = await page(permis());
  const bt = p.locator('.cp-bt', { hasText: 'Demander mon plan' });
  ok(await bt.count() === 1 && !(await bt.isDisabled()), 'autorisé : « Demander mon plan » actif');
  await shot(p, 'mollie-autorise-coach');
  await bt.tap(); await p.waitForTimeout(300);
  const m = p.locator('.cp-modale');
  ok(/Mode test/.test(await m.innerText()), 'autorisé : mention « Mode test » dans la fenêtre');
  await m.locator('.cp-oui-non').nth(0).locator('.qc-chip', { hasText: 'Oui' }).tap();
  await m.locator('.cp-oui-non').nth(1).locator('.qc-chip', { hasText: 'Non' }).tap();
  await m.locator('.cp-consent input').nth(0).check(); await m.locator('.cp-consent input').nth(1).check();
  await shot(p, 'mollie-autorise-fenetre');
  await m.locator('.cp-bt--or', { hasText: 'paiement' }).tap(); await p.waitForTimeout(800);
  const cree = p.appels.find(a => a.nom === 'creerPaiementMollie');
  ok(cree && cree.corps.type === 'plan' && !('montant' in cree.corps) && !('amount' in cree.corps), 'autorisé : création du paiement « plan », sans montant côté client');
  ok(/mollie\.test/.test(p.url()), 'autorisé : envoyé vers la page de paiement Mollie');
  await p.context().close();

  // 4) Retour : paiement confirme -> questionnaire
  p = await page(permis({ statut: 'paid', type: 'plan', activee: true }), RETOUR);
  ok(/Ton programme commence ici/.test(await p.locator('.pg-qc').innerText().catch(() => '')), 'retour payé : accueil du questionnaire');
  await shot(p, 'mollie-retour-paye'); await p.context().close();

  // 5) Retour annule / echoue / expire : message clair, aucun acces
  for (const [statut, motif, nom] of [['canceled', /Paiement annulé/, 'annule'], ['failed', /Paiement refusé/, 'echoue'], ['expired', /Paiement expiré/, 'expire']]) {
    p = await page(permis({ statut, type: 'plan', activee: false }), RETOUR);
    ok(motif.test(await p.locator('[data-retour]').innerText()), `retour ${nom} : message clair`);
    ok(/rien n'est activé|Rien n'a été débité/i.test(await p.locator('[data-retour]').innerText()), `retour ${nom} : « rien n'est activé »`);
    ok(await p.locator('.pg-qc').count() === 0, `retour ${nom} : pas de questionnaire`);
    ok(await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).count() === 1, `retour ${nom} : on peut réessayer`);
    if (statut === 'canceled') await shot(p, 'mollie-retour-annule');
    await p.locator('[data-retour] .cp-bt', { hasText: 'Fermer' }).tap(); await p.waitForTimeout(200);
    ok(await p.locator('[data-retour]').count() === 0, `retour ${nom} : fermeture du message`);
    await p.context().close();
  }

  // 6) Retour en attente puis confirme (webhook en retard)
  let n = 0;
  p = await page((nom, corps) => {
    if (nom === 'mollieEtat' && corps.retour) { n++; return { status: 200, body: { ok: true, autorise: true, mode: 'test', paiement: n < 2 ? { statut: 'open', type: 'plan', activee: false } : { statut: 'paid', type: 'plan', activee: true } } }; }
    return permis()(nom, corps);
  }, RETOUR);
  ok(/en cours de confirmation/.test(await p.locator('[data-retour]').innerText()), 'retour en attente : message « en cours de confirmation »');
  ok(await p.locator('.pg-qc').count() === 0, 'retour en attente : pas de questionnaire tant que non confirmé');
  await shot(p, 'mollie-retour-attente');
  await p.waitForSelector('.pg-qc', { timeout: 8000 });
  ok(true, 'retour en attente puis payé : questionnaire ouvert après confirmation du serveur');
  await p.context().close();

  // 7) Reponse serveur invalide au retour : jamais d'acces
  p = await page((nom, corps) => nom === 'mollieEtat' && corps.retour ? { status: 500, body: {} } : permis()(nom, corps), RETOUR);
  ok(await p.locator('.pg-qc').count() === 0 && await p.locator('[data-retour]').count() === 1, 'retour sans réponse fiable : aucun accès');
  await p.context().close();

  // 8) Compte sans paiement trouve
  p = await page((nom, corps) => nom === 'mollieEtat' && corps.retour ? { status: 200, body: { ok: true, autorise: false, mode: 'test', paiement: { statut: 'aucune', activee: false } } } : refuse(), RETOUR);
  ok(/Paiement non trouvé/.test(await p.locator('[data-retour]').innerText()) && await p.locator('.pg-qc').count() === 0, 'retour sans paiement : « Paiement non trouvé », aucun accès');
  await p.context().close();
} finally { await nav.close(); try { process.kill(-srv.pid); } catch (e) {} }
process.exit(code);
