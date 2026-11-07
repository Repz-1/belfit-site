// Ecran plan offert, viewport mobile SIMULE (Chrome headless, 390x844).
// Ce n'est pas un iPhone. Aucun appel reseau vers BelFit ou Mollie :
// les fonctions sont interceptees. Donnees fictives, compte « test ».
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
execSync('npx vite build --config apercu.config.js', { cwd: new URL('../app-v2/', import.meta.url), stdio: 'inherit' });
const PORT = 8094;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref();
await new Promise(r => setTimeout(r, 800));
let code = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const chrome = process.env.CHROME || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/usr/local/bin/google-chrome');
const nav = await chromium.launch({ executablePath: chrome });
const le = new Date().toISOString();
const dossier = { commande: { source: 'offert', payeLe: le, montant: '0 EUR', type: 'plan', commande: 'PLANOFF1' }, questionnaire: null };

const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
const appels = [];
await ctx.route('https://europe-west1-repz-baf60.cloudfunctions.net/**', (route) => {
  const u = route.request().url();
  appels.push(u);
  if (u.includes('utiliserInvitation')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, type: 'plan', mode: 'offert' }) });
  }
  if (u.includes('mollieEtat')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, autorise: true, paiement: { statut: 'expired', activee: false } }) });
  }
  return route.abort();
});
await ctx.addInitScript((d) => {
  localStorage.clear();
  localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d));
}, dossier);
const page = await ctx.newPage();
page.on('pageerror', (e) => ok(false, 'erreur JS ' + e.message));
const boites = [];
page.on('dialog', (d) => { boites.push(d.message()); d.accept(); });

await page.goto(`http://127.0.0.1:${PORT}/app.html?invitation=planoff1&onglet=premium`);
await page.waitForTimeout(1800);
let t = await page.locator('body').innerText();
ok(/Plan offert/.test(t), 'mobile simule : carte Plan offert');
ok(!/80 €/.test(t) && !/Paiement reçu/.test(t) && !/délai pour payer/.test(t), 'mobile simule : pas d offre 80 €, pas de paiement recu, pas le message Mollie');
ok(appels.some(u => u.includes('utiliserInvitation')) && !appels.some(u => u.includes('creerPaiementMollie')), 'le lien appelle utiliserInvitation, jamais creerPaiementMollie');
const garde = await page.evaluate(() => localStorage.getItem('belfit_invitation'));
ok(garde === null, 'lien accepte : le code memorise est retire');

await page.locator('.cp-bt', { hasText: 'Compléter mon questionnaire' }).tap();
await page.waitForTimeout(400);
t = await page.locator('.cp-modale').innerText();
ok(/Premier plan offert/.test(t) && /Aucun paiement/.test(t), 'consentements : plan offert, aucun paiement');
ok(/18 ans/.test(t) && /trouble alimentaire/.test(t), 'questions age et sante');
ok(!/80 €/.test(t) && !/Mollie/.test(t) && !/virement/i.test(t), 'modale offerte : pas de prix, pas de Mollie, pas de virement');
const puces = page.locator('.cp-modale .qc-chip');
await puces.nth(0).tap();
await puces.nth(3).tap();
await page.locator('.cp-modale .cp-consent input').nth(0).check();
await page.locator('.cp-modale .cp-consent input').nth(1).check();
t = await page.locator('.cp-modale').innerText();
ok(/conditions/.test(t), 'cases legales visibles');
await page.locator('.cp-modale .cp-bt', { hasText: 'Continuer vers le questionnaire' }).tap();
await page.waitForTimeout(500);
ok(await page.locator('.pg-qc').count() === 1, 'apres consentements : le questionnaire s ouvre');
ok(!appels.some(u => u.includes('creerPaiementMollie')), 'ouvrir le questionnaire ne cree pas de paiement');

await ctx.close();

// Retour Mollie, sans invitation : le message d expiration reste celui du paiement.
const ctx2 = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
const appels2 = [];
await ctx2.route('https://europe-west1-repz-baf60.cloudfunctions.net/**', (route) => {
  appels2.push(route.request().url());
  if (route.request().url().includes('mollieEtat')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, autorise: true, paiement: { statut: 'expired', activee: false } }) });
  }
  return route.abort();
});
const page2 = await ctx2.newPage();
page2.on('pageerror', (e) => ok(false, 'erreur JS retour ' + e.message));
await page2.goto(`http://127.0.0.1:${PORT}/app.html?onglet=premium&coach=questionnaire&type=plan`);
await page2.waitForTimeout(1800);
const t2 = await page2.locator('body').innerText();
ok(/Le délai pour payer est dépassé/.test(t2), 'retour Mollie expire : phrase inchangee');
ok(/80 €/.test(t2), 'sans commande offerte : l offre 80 € reste');
ok(!appels2.some(u => u.includes('utiliserInvitation')), 'retour Mollie : pas une invitation');
await ctx2.close();
await nav.close();
try { process.kill(-srv.pid); } catch { srv.kill(); }
process.exit(code);
