// Bloc « Invite des amis » (et section « Social ») retire des Parametres (28/10, demande de Raci :
// « Tu supprimes aussi l'invitation des amis »). Le code de parrainage etait deja retire en v634.
// Monte la vraie page Reglages du banc d'apercu (app-v2/apercu, p=reglages).
//   cd app-v2 && npx vite build --config apercu.config.js && cd .. && node tools/test-sans-invite-amis.mjs
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { existsSync, readFileSync, mkdirSync } from 'fs';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/google-chrome'].find(existsSync);
const SHOTS = process.env.SHOTS || '/workspace/shots';
mkdirSync(SHOTS, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8081', '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: CHROME });
const page = await (await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-BE' })).newPage();
page.on('pageerror', e => { console.log('ERREUR JS', e.message); code = 1; });
await page.goto('http://localhost:8081/index.html?p=reglages');
await page.waitForSelector('.rg-corps', { timeout: 15000 }); await page.waitForTimeout(1200);
const corps = await page.locator('.rg-corps').innerText();
// 1. Le bloc et sa section ont disparu
ok(!/Invite des amis|Invite friends|Nodig vrienden/i.test(corps), 'plus de ligne « Invite des amis »');
ok(!/1 mois offert|filleul|1 free month|1 maand gratis/i.test(corps), 'plus de texte « 1 mois offert quand ton filleul s\'abonne »');
const titres = await page.locator('.rg-section').allInnerTexts();
console.log('  sections :', titres.join(' | '));
ok(!titres.some(s => /^\s*(Social|Sociaal)\s*$/i.test(s)), 'plus de titre de section « Social »');
ok(await page.locator('.rg-carte').count() === titres.length, 'aucune carte vide : une carte par titre de section (' + titres.length + ')');
// 2. Le reste des Parametres est la
ok(/Nous écrire/.test(corps), 'section Aide : « Nous écrire » est toujours la');
ok(/Politique de confidentialité/.test(corps), 'section Documents : confidentialite toujours la');
ok(/J'ai un code/.test(corps), "« J'ai un code » est toujours la");
ok(/Compte/i.test(corps) && /déconnecter/i.test(corps), 'Compte et deconnexion sont toujours la');
// 3. Pas de code de parrainage non plus (v634)
ok(!/Ton code|Your code|Jouw code/.test(corps) && !/BF-[A-Z0-9]{4}-[A-Z0-9]{4}/.test(corps), 'toujours aucun code de parrainage');
ok((await page.locator('.rg-code, .rg-copier').count()) === 0, 'toujours aucun bouton Copier de code');
// 4. Source : plus de trace du bloc, des cles de texte, ni de la lecture du code
const lire = (p) => readFileSync(new URL('../app-v2/src/' + p, import.meta.url), 'utf8');
const rj = lire('components/Reglages.jsx');
ok(!/set_sec_social|set_invite|invite_text|invite_copied|navigator\.share/.test(rj), 'Reglages.jsx : plus de bloc Social / invitation / partage');
ok(!/mon_code_parrainage|set_ref_code|invite_code/.test(rj), 'Reglages.jsx ne lit ni ne montre plus mon_code_parrainage');
for (const f of ['legacy/strings.js', 'i18n/index.js']) {
  const s = lire(f);
  ok(!/set_sec_social|set_invite|js_invite_msg|js_invite_copied|invite_text|invite_copied/.test(s), f + ' : plus de texte d\'invitation (fr, en, nl)');
}
// 5. Aucun autre ecran ne renvoie vers le bloc
const { execSync } = await import('child_process');
const autres = execSync("git grep -n -E \"set_invite|set_sec_social|invite_text|invite_copied|Invite des amis\" -- app-v2/src ':!app-v2/src/legacy/seance.body.html' || true", { encoding: 'utf8' }).trim();
ok(autres === '', 'aucun autre fichier de app-v2/src ne reference le bloc' + (autres ? '\n' + autres : ''));
// Capture (bandeau EXEMPLE, comme les autres captures du banc)
await page.evaluate(() => { const b = document.createElement('div'); b.id = 'banc-ex'; b.textContent = 'EXEMPLE · banc d\'aperçu · données de test'; b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c00;color:#fff;font:700 11px sans-serif;text-align:center;padding:3px'; document.body.appendChild(b); });
await page.setViewportSize({ width: 390, height: 1500 }); await page.waitForTimeout(400);
await page.screenshot({ path: SHOTS + '/sans-invite-amis-390.png' });
console.log('capture : ' + SHOTS + '/sans-invite-amis-390.png');
await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill(); process.exit(code);
