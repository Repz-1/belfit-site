// Page coach.html : plusieurs versions d'un plan, chacune avec sa date de debut.
// Serveur du coach SIMULE (aucun envoi reel) ; TOUTES les donnees sont fictives.
// Sortie : captures 390 px dans $SHOTS (defaut /workspace/shots).
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8095, SHOTS = process.env.SHOTS || '/workspace/shots';
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', '.'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1200));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
let envois = [];
async function ouvrir() {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  await ctx.addInitScript(() => localStorage.setItem('belfit_espace_coach', 'code-de-test'));
  await ctx.route(/cloudfunctions\.net/, (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    const c = JSON.parse(r.request().postData() || '{}');
    if (c.action === 'deposer') envois.push(c);
    const corps = c.action === 'dossiers' ? { ok: true, dossiers: [] } : c.action === 'deposer' ? { ok: true, mailEnvoye: true } : { ok: true, acces: [], invitations: [] };
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corps) });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { console.log('ERREUR JS', e.message); code = 1; });
  p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${PORT}/coach.html`); await p.waitForTimeout(1500);
  return p;
}
const banniere = (p, t) => p.evaluate((t) => { const b = document.createElement('div'); b.id = 'banc'; b.textContent = t; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:3px'; document.body.appendChild(b); }, t);
const lignes = (p) => p.locator('#listeVersions .ver').allInnerTexts();

// (1) Plan unique sans date : le depot reste celui d'avant (pas de « versions »)
let p = await ouvrir();
ok(await p.locator('#listeVersions .ver').count() === 1, 'au depart : une seule version');
ok((await lignes(p))[0].includes('plan unique'), 'une seule version sans date = « plan unique, envoye tout de suite »');
await p.locator('#btnModele').click(); await p.waitForTimeout(400);
ok(await p.locator('#listeVersions .ver').count() === 5, 'modele : 5 versions');
const l0 = await lignes(p);
ok(l0.every((t) => t.includes('sans date : non appliquée')), 'modele : chaque version porte « sans date : non appliquée » (aucune date inventee)');
ok(l0[0].includes('Semaine 1') && l0[4].includes('Semaines 5 à 8'), 'modele : libelles Semaine 1 … Semaines 5 à 8');
ok(await p.locator('#btnEspacer').isDisabled(), '« Espacer » inactif tant que le coach n\'a pas tape la 1re date');
await banniere(p, 'EXEMPLE · modèle pré-rempli, SANS dates · serveur simulé');
await p.locator('#versionsCarte').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -50)); await p.waitForTimeout(300);
await p.screenshot({ path: SHOTS + '/plans-coach-sans-date.png' });
await p.evaluate(() => document.getElementById('banc').remove());
// envoi sans date : le coach est prevenu avant
await p.fill('#client', 'client-test@exemple.test');
let confirmation = null; p.removeAllListeners('dialog'); p.on('dialog', (d) => { confirmation = d.message(); d.dismiss(); });
await p.locator('#btnEnvoi').click(); await p.waitForTimeout(400);
ok(/5 versions sans date ne seront pas appliquées/.test(confirmation || ''), 'envoi sans date : avertissement « 5 versions sans date ne seront pas appliquees »');
ok(envois.length === 0, 'avertissement refuse : rien n\'est envoye');
// dates : 1re date, puis « Espacer d'une semaine »
await p.fill('#vPremier', '2026-11-02'); await p.waitForTimeout(200);
await p.locator('#btnEspacer').click(); await p.waitForTimeout(300);
const l1 = await lignes(p);
ok(l1[0].includes('2 nov') && l1[1].includes('9 nov') && l1[2].includes('16 nov') && l1[3].includes('23 nov') && l1[4].includes('30 nov'), 'espacer : 2, 9, 16, 23 et 30 nov.');
ok(!l1.some((t) => t.includes('sans date')), 'plus aucun avertissement « sans date »');
await banniere(p, 'EXEMPLE · dates de test (2 nov. = date fictive) · serveur simulé');
await p.locator('#versionsCarte').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -50)); await p.waitForTimeout(300);
await p.screenshot({ path: SHOTS + '/plans-coach-versions.png' });
await p.locator('#total').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
// ouvrir la version 5
await p.locator('#listeVersions .ver').nth(4).click(); await p.waitForTimeout(300);
ok(/semaines 5 à 8/i.test(await p.locator('#titreRepas').innerText()), 'ouvrir la version 5 : le titre des repas la nomme');
await p.locator('#titreRepas').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -60)); await p.waitForTimeout(300);
await p.screenshot({ path: SHOTS + '/plans-coach-version5.png', fullPage: false });
await p.evaluate(() => document.getElementById('banc').remove());
// envoi reel (simule)
p.removeAllListeners('dialog'); p.on('dialog', (d) => { confirmation = d.message(); d.accept(); });
await p.locator('#btnEnvoi').click(); await p.waitForTimeout(600);
ok(/Envoyer 5 versions/.test(confirmation || ''), 'envoi : confirmation « Envoyer 5 versions … chacune a sa date »');
const e = envois[0];
ok(e && Array.isArray(e.versions) && e.versions.length === 5 && !('repas' in e), 'envoi : payload « versions » (5), pas de plan unique');
ok(e.versions.map((v) => v.debut).join() === '2026-11-02,2026-11-09,2026-11-16,2026-11-23,2026-11-30', 'envoi : les 5 dates du coach, telles quelles');
ok(e.versions.every((v) => v.kcal > 2900 && v.repas.length === 6 && v.libelle), 'envoi : chaque version a ses calories, 6 repas et son libelle');
ok(e.versions[0].kcal < e.versions[4].kcal, 'envoi : calories croissantes (' + e.versions.map((v) => v.kcal).join(' → ') + ')');
ok(/Programme envoyé/.test(await p.locator('#msg').innerText()), 'retour du serveur simule affiche');
await p.context().close();

// (2) Une version qui n'a pas de date au milieu : avertie, et envoyee sans date (null)
envois = []; p = await ouvrir();
await p.locator('#btnModele').click(); await p.fill('#client', 'client-test@exemple.test');
await p.fill('#vPremier', '2026-11-02'); await p.locator('#btnEspacer').click();
await p.locator('#listeVersions .ver').nth(2).click(); await p.fill('#vDebut', ''); await p.locator('#vDebut').dispatchEvent('change'); await p.waitForTimeout(200);
const l2 = await lignes(p);
ok(l2[2].includes('sans date : non appliquée') && !l2[1].includes('sans date'), 'une seule version sans date : signalee sur elle seule');
p.removeAllListeners('dialog'); p.on('dialog', (d) => { confirmation = d.message(); d.accept(); });
await p.locator('#btnEnvoi').click(); await p.waitForTimeout(500);
ok(/1 version sans date ne sera pas appliquée/.test(confirmation || ''), 'avertissement au singulier');
ok(envois[0].versions[2].debut === null && envois[0].versions[1].debut === '2026-11-09', 'envoi : la version sans date part avec debut = null (le serveur n\'invente rien)');
await p.context().close();

// (3) On retombe sur une seule version sans date : depot « d'avant », a l'identique
envois = []; p = await ouvrir();
await p.locator('#btnModele').click(); await p.fill('#client', 'client-test@exemple.test');
for (let i = 0; i < 4; i++) { await p.locator('#btnVerSuppr').click(); await p.waitForTimeout(150); }
ok(await p.locator('#listeVersions .ver').count() === 1 && await p.locator('#btnVerSuppr').isDisabled(), 'suppression : il reste une version, on ne peut pas supprimer la derniere');
confirmation = null; p.removeAllListeners('dialog'); p.on('dialog', (d) => { confirmation = d.message(); d.accept(); });
await p.locator('#btnEnvoi').click(); await p.waitForTimeout(500);
const u = envois[0];
ok(u && !('versions' in u) && Array.isArray(u.repas) && u.repas.length === 6 && u.kcal > 0 && u.prot > 0, 'plan unique sans date : payload d\'avant (repas + kcal/prot/carbs/lip), pas de « versions »');
ok(confirmation === null, 'plan unique : aucune question en plus (comme avant)');
await p.context().close();

// (4) Copier une version
p = await ouvrir();
await p.locator('#btnModele').click(); await p.locator('#listeVersions .ver').nth(1).click(); await p.locator('#btnVerCopie').click(); await p.waitForTimeout(300);
const l4 = await lignes(p);
ok(l4.length === 6 && l4[2].includes('sans date'), 'copie : une 6e version apparait apres la version 2, sans date');
await p.context().close();

await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill();
process.exit(code);
