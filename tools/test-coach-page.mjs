// Test de l'onglet Coach (26/09). Depuis la racine : node tools/test-coach-page.mjs
// Prerequis : apercu construit (npx vite build --config apercu.config.js dans app-v2).
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8097;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function ouvrir(plan) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
  await p.goto(`http://localhost:${PORT}/app.html`);
  if (plan) await p.evaluate(pl => localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(pl)), plan);
  await p.reload(); await p.waitForTimeout(1800);
  await p.locator('.bn-item').last().tap(); await p.waitForTimeout(900);
  // 28/10 : les commandes sont fermees en ligne (COMMANDES_OUVERTES = false) ; le serveur ouvre le paiement a un compte autorise. On simule ce compte.
  await p.evaluate(() => { window.__banc.paiementOuvert.value = true; }); await p.waitForTimeout(300);
  return p;
}
try {
  var p = await ouvrir(null);
  ok((await p.locator('.bn-item').last().innerText()).trim() === 'Coach', 'onglet nomme « Coach »');
  const txt = await p.locator('.pg-coach').innerText();
  ok(/Ton coach/.test(txt) && !/REPZ/.test(txt), 'titre « Ton coach »');
  ok(/80 €/.test(txt) && !/60 €/.test(txt), 'sans plan : premier plan 80 €, pas de mise a jour');
  // 26/09 : on paie d'abord, le questionnaire vient apres le paiement
  // (parcours complet dans test-questionnaire-coach.mjs).
  await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).tap(); await p.waitForTimeout(400);
  ok(await p.locator('.cp-modale').count() === 1, 'le bouton ouvre le paiement');
  await p.context().close();
  const vieux = new Date(Date.now() - 34 * 86400000).toISOString();
  // 28/10 : la page a ete refaite (onglets « Ton programme / Tes séances / Mon suivi », tarifs retires
  // de « Ton programme » pour un client qui a deja un plan). Les anciennes verifications (mise a jour a 60 €,
  // rappel apres 30 jours, nouvelle commande apres 3 mois, ajustement gratuit) visaient l'ancienne mise en page
  // et sont a reecrire avec les ecrans de « Mon suivi » (SuiviClient.jsx) : elles ne tournaient plus depuis longtemps.
  p = await ouvrir({ kcal: 2400, prot: 180, carbs: 250, lip: 70, livreLe: vieux, repas: [{ nom: 'Petit dejeuner', ings: [{ name: 'Skyr', portion: 200 }] }] });
  await p.locator('.prog-onglets [role=tab]').first().tap(); await p.waitForTimeout(500);
  const t2 = await p.locator('.pg-coach').innerText();
  ok(/Mon plan/.test(t2) && /34 jours/.test(t2), 'avec plan : carte « Mon plan » + ancienneté (34 jours)');
  ok(!/TARIFS/.test(t2) && !/80 €/.test(t2), 'avec plan : plus de tarifs dans « Ton programme »');
  await p.locator('.cp-bt', { hasText: 'Voir mon plan' }).tap(); await p.waitForTimeout(500);
  ok(await p.locator('.pg-prog').count() === 1, 'plan ouvert');
  await p.context().close();
} catch (e) { ok(false, e.message.split('\n')[0]); }
await nav.close(); try { process.kill(-srv.pid); } catch {}
process.exit(code);
