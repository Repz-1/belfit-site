// Page coach.html, bloc « Codes de réduction » : serveur adminCodesReduction SIMULE.
// Aucune requete reelle, aucun vrai code : TEST10 / TEST25 / ... n'existent que dans ce fichier.
// Depuis la racine : node tools/test-code-reduction-coach.mjs   (SHOTS=/workspace/shots pour les captures 390 px)
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8098, SHOTS = process.env.SHOTS || '';
const SECRET = 'secret-de-test-local';
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', '.'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1200));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
const demain = new Date(Date.now() + 86400000).toISOString();
const ago = (n) => new Date(Date.now() - n * 86400000).toISOString();

async function ouvrir(etat) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  await ctx.addInitScript((s) => localStorage.setItem('belfit_espace_coach', s), SECRET);
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.appels = []; p.urls = []; p.dialogues = []; p.reponse = null;
  await ctx.route(/cloudfunctions\.net/, (r) => {
    const req = r.request();
    if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    const c = JSON.parse(req.postData() || '{}'); const nom = req.url().split('/').pop();
    const rep = (status, body) => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (nom !== 'adminCodesReduction') return rep(200, { ok: true, dossiers: [], codes: [], offerts: [], invitations: [] });
    p.appels.push(c); p.urls.push(req.url());
    if (c.code !== SECRET) return rep(403, { ok: false, motif: 'secret' });
    if (p.reponse) { const x = p.reponse(c); if (x) return rep(x[0], x[1]); }
    if (c.action === 'lister') return rep(200, { ok: true, codes: etat.codes });
    if (c.action === 'creer') {
      const nomCode = c.nomCode || 'ALEA7K2M';
      if (etat.codes.some((x) => x.code === nomCode)) return rep(409, { ok: false, motif: 'existe' });
      etat.codes.unshift({ code: nomCode, pourcent: c.pourcent, actif: true, etat: 'libre', note: c.note || '', cree: new Date().toISOString(), expire: null, utiliseLe: null });
      return rep(200, { ok: true, code: nomCode, pourcent: c.pourcent, montant: ((8000 - 80 * c.pourcent) / 100).toFixed(2) });
    }
    if (c.action === 'desactiver' || c.action === 'reactiver') {
      const x = etat.codes.find((y) => y.code === c.nomCode); if (!x) return rep(404, { ok: false, motif: 'inconnu' });
      x.actif = c.action === 'reactiver'; return rep(200, { ok: true, code: x.code, actif: x.actif });
    }
    return rep(400, { ok: false, motif: 'action' });
  });
  p.on('pageerror', (e) => ok(false, 'erreur JS ' + e.message));
  p.on('dialog', (d) => { p.dialogues.push(d.message()); (p.refuser ? d.dismiss() : d.accept()); });
  await p.goto(`http://localhost:${PORT}/coach.html`); await p.waitForTimeout(1500);
  return p;
}
const bandeau = (p, t) => p.evaluate((t) => { let b = document.getElementById('banc'); if (!b) { b = document.createElement('div'); b.id = 'banc'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:3px'; document.body.appendChild(b); } b.textContent = t; }, t);
const shot = async (p, nom, t) => {
  if (!SHOTS) return;
  await bandeau(p, 'EXEMPLE · ' + t + ' · serveur et codes simulés');
  await p.evaluate(() => { const e = document.querySelector('#redNom').closest('.carte'); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 40); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${SHOTS}/code-reduction-coach-${nom}.png` });
};
const lignes = (p) => p.locator('#listeRed .red-code').allInnerTexts();
try {
  // (1) liste vide
  let etat = { codes: [] }; let p = await ouvrir(etat);
  ok(await p.locator('.lb', { hasText: 'Codes de réduction' }).count() === 1, 'le bloc « Codes de réduction » est dans la page coach');
  const ordre = await p.evaluate(() => { const t = [...document.querySelectorAll('#ecranTravail .lb')].map((e) => e.textContent); return [t.indexOf('Accès'), t.indexOf('Codes de réduction'), t.indexOf('Envoyer un programme')]; });
  ok(ordre[0] >= 0 && ordre[0] < ordre[1] && ordre[1] < ordre[2], 'placé après « Accès », avant « Envoyer un programme » (comme les autres actions)');
  ok(/Aucun code de réduction/.test(await p.locator('#listeRed').innerText()), 'liste vide : « Aucun code de réduction pour le moment. »');
  const l0 = p.appels[0]; ok(l0 && l0.action === 'lister' && l0.code === SECRET && !p.urls[0].includes(SECRET), 'au chargement : « lister », code coach dans le CORPS de la requête, jamais dans l\'adresse');
  ok(!(await p.evaluate(() => document.body.innerText)).includes(SECRET) && !(await p.evaluate(() => document.documentElement.innerHTML)).includes(SECRET), 'le code coach n\'est ni affiché ni écrit dans la page');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'pas de débordement horizontal à 390 px');
  const tailles = await p.evaluate(() => ['#redNom', '#redNote', '#redPc', '#btnRed'].map((s) => document.querySelector(s).getBoundingClientRect().height));
  ok(tailles.every((h) => h >= 40), 'champs et bouton assez grands pour le doigt (≥ 40 px)');
  await shot(p, '1-vide', 'liste vide');

  // (2) validations locales (aucun appel)
  const n0 = p.appels.length;
  await p.locator('#btnRed').tap(); await p.waitForTimeout(200);
  ok(/de 1 à 90/.test(await p.locator('#msgRed').innerText()) && p.appels.length === n0 && p.dialogues.length === 0, 'pourcentage manquant : message clair, aucun appel, aucune confirmation');
  await p.fill('#redPc', '95'); await p.locator('#btnRed').tap(); await p.waitForTimeout(200);
  ok(/de 1 à 90/.test(await p.locator('#msgRed').innerText()) && p.appels.length === n0, '95 % : refusé avant tout appel (plafond 90 %)');
  await p.fill('#redPc', '10'); await p.fill('#redNom', 'ab'); await p.locator('#btnRed').tap(); await p.waitForTimeout(200);
  ok(/4 à 32/.test(await p.locator('#msgRed').innerText()) && p.appels.length === n0, 'nom trop court : refusé avant tout appel');

  // (3) creation : confirmation d'abord (refusee = rien envoye)
  await p.fill('#redNom', 'test 10'); await p.fill('#redPc', '10'); await p.fill('#redNote', 'Kevin (exemple)');
  p.refuser = true; await p.locator('#btnRed').tap(); await p.waitForTimeout(300);
  ok(/TEST10/.test(p.dialogues.at(-1)) && /−10 %/.test(p.dialogues.at(-1)) && /72/.test(p.dialogues.at(-1)) && /une fois/.test(p.dialogues.at(-1)), 'confirmation avant création : code normalisé TEST10, −10 %, 72 €, « une fois »');
  ok(p.appels.length === n0, 'confirmation refusée : rien n\'est créé');
  p.refuser = false; await p.locator('#btnRed').tap(); await p.waitForTimeout(600);
  const cr = p.appels.find((a) => a.action === 'creer');
  ok(cr && cr.nomCode === 'TEST10' && cr.pourcent === 10 && cr.note === 'Kevin (exemple)' && cr.code === SECRET && !p.urls.at(-1).includes(SECRET), 'création : nom, pourcentage et note envoyés ; code coach dans le corps');
  ok(/Code créé/.test(await p.locator('#msgRed').innerText()) && /TEST10/.test(await p.locator('#redNouveau').innerText()) && /72/.test(await p.locator('#redNouveau').innerText()), 'création : message et rappel « Code : TEST10 · −10 % · 72 € au lieu de 80 € »');
  ok(await p.inputValue('#redNom') === '' && await p.inputValue('#redPc') === '', 'champs vidés après création');
  ok((await lignes(p)).some((t) => /TEST10/.test(t) && /actif/.test(t) && /Kevin \(exemple\)/.test(t)), 'la liste montre TEST10 · actif · note');
  await shot(p, '2-creation', 'création du code TEST10');

  // (4) code au hasard
  await p.fill('#redPc', '25'); await p.locator('#btnRed').tap(); await p.waitForTimeout(600);
  ok(/au hasard/.test(p.dialogues.at(-1)) && p.appels.filter((a) => a.action === 'creer').at(-1).nomCode === '', 'nom vide : confirmation « un code au hasard », le serveur choisit le code');
  ok(/ALEA7K2M/.test(await p.locator('#redNouveau').innerText()), 'le code choisi par le serveur est montré à Raci pour le donner');

  // (5) erreurs du serveur
  await p.fill('#redNom', 'TEST10'); await p.fill('#redPc', '10'); await p.locator('#btnRed').tap(); await p.waitForTimeout(500);
  ok(/existe déjà/.test(await p.locator('#msgRed').innerText()), '409 : « Ce code existe déjà »');
  p.reponse = () => [429, { ok: false, motif: 'attente' }]; await p.locator('#btnRed').tap(); await p.waitForTimeout(500);
  ok(/Trop d'essais/.test(await p.locator('#msgRed').innerText()), '429 : « Trop d\'essais. Réessaie dans 15 minutes. »');
  p.reponse = () => [403, { ok: false, motif: 'secret' }]; await p.locator('#btnRed').tap(); await p.waitForTimeout(500);
  ok(/refuse le code coach/.test(await p.locator('#msgRed').innerText()) && await p.locator('#ecranTravail').isVisible(), '403 : message clair, sans effacer la session');
  p.reponse = null;
  await p.context().close();

  // (6) liste avec tous les etats + desactivation
  etat = { codes: [
    { code: 'TEST10', pourcent: 10, actif: true, etat: 'libre', note: 'Kevin (exemple)', cree: ago(1) },
    { code: 'TEST25', pourcent: 25, actif: true, etat: 'reserve', note: 'Sarah (exemple)', cree: ago(2) },
    { code: 'TEST15', pourcent: 15, actif: false, etat: 'libre', note: '', cree: ago(3) },
    { code: 'TESTUTILISE', pourcent: 20, actif: true, etat: 'utilise', note: '', cree: ago(9), utiliseLe: ago(4) },
    { code: 'XSSTEST', pourcent: 5, actif: true, etat: 'libre', note: '<img src=x onerror=alert(1)>', cree: ago(10) },
  ] };
  p = await ouvrir(etat);
  const l = await lignes(p);
  ok(l.length === 5 && /TEST10[\s\S]*−10 %[\s\S]*72 €[\s\S]*actif/.test(l[0]) && /réservé/.test(l[1]) && /désactivé/.test(l[2]) && /utilisé/.test(l[3]), 'liste : code, %, prix, état (actif / réservé / désactivé / utilisé) et note');
  ok(/Kevin \(exemple\)/.test(l[0]) && /utilisé le/.test(l[3]), 'note affichée ; code utilisé : date d\'utilisation');
  ok(await p.locator('#listeRed img').count() === 0, 'une note avec du HTML s\'affiche en texte (rien n\'est interprété)');
  ok(await p.locator('#listeRed .red-code').nth(3).locator('button').count() === 0, 'un code déjà utilisé n\'a aucun bouton');
  ok(await p.locator('#listeRed button', { hasText: 'Désactiver' }).count() === 3 && await p.locator('#listeRed button', { hasText: 'Réactiver' }).count() === 1, 'boutons « Désactiver » (actifs et réservés) et « Réactiver » (désactivés)');
  ok(!/supprim/i.test(await p.locator('#listeRed').innerText()) && !/supprim/i.test(await p.locator('.carte', { has: p.locator('#redNom') }).innerText()), 'aucun bouton « supprimer » : pas de suppression physique');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'liste : pas de débordement horizontal à 390 px');
  await shot(p, '3-liste', 'liste avec codes de test');
  // desactivation : confirmation refusee, puis acceptee
  const n1 = p.appels.length; p.refuser = true;
  await p.locator('#listeRed .red-code').nth(0).locator('button').tap(); await p.waitForTimeout(300);
  ok(/Désactiver le code TEST10/.test(p.dialogues.at(-1)) && /Rien n'est supprimé/.test(p.dialogues.at(-1)) && p.appels.length === n1, 'confirmation avant désactivation (refusée : aucun appel)');
  p.refuser = false;
  await p.locator('#listeRed .red-code').nth(0).locator('button').tap(); await p.waitForTimeout(700);
  const d = p.appels.find((a) => a.action === 'desactiver');
  ok(d && d.nomCode === 'TEST10' && d.code === SECRET, 'désactivation : action « desactiver » sur TEST10');
  ok(/TEST10 désactivé/.test(await p.locator('#msgRed').innerText()) && /désactivé/.test((await lignes(p))[0]) && etat.codes[0].actif === false, 'message « Code TEST10 désactivé. », la liste se met à jour');
  ok(!p.appels.some((a) => /suppr|delete|effacer/i.test(a.action)), 'aucune action de suppression envoyée');
  await shot(p, '4-desactivation', 'TEST10 désactivé');
  ok(await p.evaluate(() => Object.keys(localStorage).join()) === 'belfit_espace_coach', 'le bloc n\'écrit rien en local (seule la clé existante de la page)');
  await p.context().close();
} catch (e) { console.error(e); code = 1; }
await nav.close(); try { process.kill(-srv.pid); } catch (e) { /* rien */ }
console.log(code ? '\nÉCHEC' : '\nOK'); process.exit(code);
