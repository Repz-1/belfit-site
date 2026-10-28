// Code de parrainage retire des Parametres (28/10, demande de Raci : « Pas de code »).
// Monte la vraie page Reglages du banc d'apercu (app-v2/apercu, p=reglages).
//   cd app-v2 && npx vite build --config apercu.config.js && cd .. && node tools/test-sans-code-parrainage.mjs
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { existsSync, readFileSync } from 'fs';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/google-chrome'].find(existsSync);
const srv = spawn('python3', ['-m', 'http.server', '8081', '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: CHROME });
const page = await (await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' })).newPage();
page.on('pageerror', e => { console.log('ERREUR JS', e.message); code = 1; });
// Le partage natif est remplace pour lire le texte envoye.
await page.addInitScript(() => { window.__partage = null; navigator.share = async (d) => { window.__partage = d; }; });
await page.goto('http://localhost:8081/index.html?p=reglages');
await page.waitForSelector('.rg-corps', { timeout: 15000 }); await page.waitForTimeout(1200);
const corps = await page.locator('.rg-corps').innerText();
ok(/Social/i.test(corps) && /Invite des amis/.test(corps), "bloc Social : « Invite des amis » est toujours la");
ok(!/Ton code|Your code|Jouw code/.test(corps), "plus de ligne « Ton code »");
ok(!/BF-[A-Z0-9]{4}-[A-Z0-9]{4}/.test(corps), 'aucun code BF-XXXX-XXXX affiche');
ok((await page.locator('.rg-code, .rg-copier').count()) === 0, 'plus de bouton Copier du code');
ok(!/^\s*Copier\s*$/m.test(corps), 'aucun bouton « Copier » dans les Parametres');
await page.locator('.rg-rangee').filter({ hasText: 'Invite des amis' }).first().tap(); await page.waitForTimeout(400);
const partage = await page.evaluate(() => window.__partage);
ok(partage && /belfit\.be/.test(partage.text), "l'invitation partage toujours le message + le lien");
ok(partage && !/code|BF-/i.test(partage.text), "le message partage ne contient aucun code");
// Le banc n'a pas de vrai compte Firestore : on verifie aussi le source (la lecture du code a ete retiree).
const src = readFileSync(new URL('../app-v2/src/components/Reglages.jsx', import.meta.url), 'utf8');
ok(!/mon_code_parrainage|set_ref_code|invite_code/.test(src), 'Reglages.jsx ne lit ni ne montre plus mon_code_parrainage');
await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill(); process.exit(code);
