// Onglet Coach « honnete » (21/10, v617) : pas de date sans paiement reel,
// pas de compteur d'ajustements, pas de bilan, boutons de paiement fermes.
// Prerequis : apercu construit (npx vite build --config apercu.config.js dans app-v2).
// TOUTES les donnees ci-dessous sont FICTIVES (banc de test).
import { spawn } from 'child_process';
import { createRequire } from 'module';
const exiger = createRequire(new URL('../app-v2/package.json', import.meta.url));
const { chromium } = exiger('playwright');
const srv = spawn('python3',['-m','http.server','8092','--directory','app-v2/apercu/construit'],{stdio:'ignore',detached:true});
await new Promise(r=>setTimeout(r,1500));
let code=0; const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m); if(!c) code=1;};
const nav = await chromium.launch({executablePath: process.env.CHROME || '/usr/bin/google-chrome'});
const jours = n => new Date(Date.now()-n*86400000).toISOString();
const PLAN = { kcal: 2100, prot: 150, carbs: 220, lip: 70, livreLe: jours(8), version: 1,
  repas: [
    { nom: 'Petit-déjeuner', ings: [{ name: 'Avoine', portion: 70 }, { name: 'Banane', portion: 120 }] },
    { nom: 'Déjeuner', ings: [{ name: 'Riz', portion: 150 }] },
    { nom: 'Collation', ings: [{ name: 'Pomme', portion: 150 }] },
    { nom: 'Dîner', ings: [{ name: 'Brocoli', portion: 200 }] } ] };
const POIDS = [{ iso: jours(14).slice(0,10), kg: 82 }, { iso: jours(7).slice(0,10), kg: 81.2 }, { iso: jours(1).slice(0,10), kg: 80.6 }];
async function ouvrir(plan, dossier, nom) {
  const ctx = await nav.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true,locale:'fr-BE'});
  await ctx.addInitScript(([p, d, w]) => {
    localStorage.clear();
    if (p) localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(p));
    localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d));
    localStorage.setItem('belfit_v2_apercu_stats', JSON.stringify({ histoJours: {}, weightLog: w }));
  }, [plan, dossier, POIDS]);
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.log('ERREUR JS ('+nom+')', e.message); code=1; });
  let mail = false; page.on('framenavigated', f => { if (f.url().startsWith('mailto:')) mail = true; });
  await page.goto('http://localhost:8092/app.html?onglet=premium'); await page.waitForTimeout(2200);
  return { page, ctx, mail: () => mail };
}
const defiler = (p, bas) => p.evaluate(b => { for (const el of [document.scrollingElement, ...document.querySelectorAll('*')]) if (el && el.scrollHeight > el.clientHeight + 20) el.scrollTop = b ? el.scrollHeight : 0; }, bas).then(() => p.waitForTimeout(400));
const txt = p => p.evaluate(() => document.body.innerText);
const verifCommun = (t, nom) => {
  ok(!/utilisé.? sur \d/.test(t), nom+' : plus de compteur « X sur N »');
  ok(!/bilan du mois/i.test(t), nom+' : pas de carte « Ton bilan du mois »');
  ok(!/IA illimitée/.test(t), nom+' : plus « IA illimitée 30 jours »');
  ok(!/revu le/.test(t), nom+' : plus « Plan revu le »');
};
const versSuivi = async p => { await p.getByText('Mon suivi', { exact: true }).first().click(); await p.waitForTimeout(700); };

// 1) Paye il y a 10 jours (payeLe reel), milieu de mois
let o = await ouvrir(PLAN, { commande: { payeLe: jours(10), type: 'plan' }, questionnaire: { envoyeLe: jours(9) } }, 'paye-milieu');
await versSuivi(o.page);
let t = await txt(o.page); verifCommun(t, 'payé milieu');
ok(/jours? restants?/.test(t) && /Du .* au /.test(t), 'payé : jours restants et dates affichés');
ok(/Ajustements inclus ce mois-ci/.test(t), 'payé : « Ajustements inclus ce mois-ci »');
ok(/Plan livré le/.test(t), 'payé : « Plan livré le »');
ok(!/60 €/.test(t), 'payé milieu de mois : pas de 60 €');
await defiler(o.page, false); await o.page.screenshot({ path: '/workspace/shots/honnete-suivi-paye-haut.png' });
const nbAjout = await o.page.locator('.sv-ajout').count();
console.log('  (info) boutons Ajouter au journal visibles :', nbAjout);
if (nbAjout) {
  const av = await o.page.evaluate(() => JSON.stringify(window.__banc.repas.value.map(r => (r.ings||[]).length)));
  await o.page.locator('.sv-ajout').first().click(); await o.page.waitForTimeout(500);
  const ap = await o.page.evaluate(() => JSON.stringify(window.__banc.repas.value.map(r => (r.ings||[]).length)));
  ok(av !== ap, 'Ajouter au journal : le repas reçoit les aliments (' + av + ' → ' + ap + ')');
}
await defiler(o.page, true);
await o.page.screenshot({ path: '/workspace/shots/honnete-suivi-paye-bas.png' });
await o.page.getByText('Ton programme', { exact: true }).first().click(); await o.page.waitForTimeout(700);
t = await txt(o.page); verifCommun(t, 'Ton programme');
ok(!/60 €/.test(t), 'Ton programme : pas de 60 €');
await defiler(o.page, false);
await o.page.screenshot({ path: '/workspace/shots/honnete-programme.png' });
await o.ctx.close();

// 2) Paye il y a 26 jours : fin de mois, 60 € discret non cliquable
o = await ouvrir({ ...PLAN, livreLe: jours(25) }, { commande: { payeLe: jours(26), type: 'plan' }, questionnaire: { envoyeLe: jours(25) } }, 'paye-fin');
await versSuivi(o.page);
t = await txt(o.page);
ok(/60 € sera bientôt disponible/.test(t), 'fin de mois : 60 € discret « bientôt disponible »');
ok((await o.page.locator('button.sv-lien').count()) === 0, 'fin de mois : 60 € non cliquable');
await defiler(o.page, true);
await o.page.screenshot({ path: '/workspace/shots/honnete-suivi-paye-fin-bas.png' });
await o.ctx.close();

// 3) Plan livre SANS payeLe (ex. depose par le coach, virement non saisi)
o = await ouvrir({ ...PLAN, repas: [...PLAN.repas, { nom: 'Repas libre XYZ', ings: [{ name: 'Pomme', portion: 100 }] }] }, { commande: null, questionnaire: { envoyeLe: jours(12) } }, 'sans-paye');
await versSuivi(o.page);
t = await txt(o.page); verifCommun(t, 'sans payeLe');
ok(!/jours? restants?/.test(t) && !/Du \d/.test(t) && (await o.page.locator('.sv-barre').count()) === 0, 'sans payeLe : ni jours, ni dates, ni barre');
ok(!/60 €|80 €/.test(t), 'sans payeLe : aucun prix');
ok(!/PROCHAINE ÉTAPE/i.test(t), 'sans payeLe : pas de carte prochaine étape');
await defiler(o.page, false); await o.page.screenshot({ path: '/workspace/shots/honnete-suivi-sanspaye-haut.png' });
await defiler(o.page, true);
await o.page.screenshot({ path: '/workspace/shots/honnete-suivi-sanspaye-bas.png' });
await o.ctx.close();

// 4) Paye il y a 4 mois : fenetre 60 € passee, 80 € « Bientot disponible », pas de mail
o = await ouvrir({ ...PLAN, livreLe: jours(119) }, { commande: { payeLe: jours(120), type: 'plan' }, questionnaire: { envoyeLe: jours(119) } }, 'expire');
await versSuivi(o.page);
t = await txt(o.page);
ok(!/Reprendre · 80 €/.test(t) && /Bientôt disponible/.test(t), 'expiré : « Bientôt disponible » au lieu de Reprendre · 80 €');
ok(!/60 €/.test(t), 'expiré : pas de 60 €');
const b = o.page.locator('.sv-etape button'); ok((await b.count()) === 1 && await b.isDisabled(), 'expiré : bouton inactif');
ok(!o.mail(), 'aucune ouverture d\'e-mail');
await o.ctx.close();

// 5) Inscrit gratuit
o = await ouvrir(null, { commande: null, questionnaire: null }, 'gratuit');
t = await txt(o.page); verifCommun(t, 'gratuit');
ok(!/60 €/.test(t), 'gratuit : pas de 60 €'); ok(/Accès nutrition 3 mois inclus/.test(t), 'gratuit : « Accès nutrition 3 mois inclus »');
ok(!/Mon suivi/.test(t), 'gratuit : pas de bouton Mon suivi');
await o.page.screenshot({ path: '/workspace/shots/honnete-gratuit-haut.png' });
await defiler(o.page, true); await o.page.screenshot({ path: '/workspace/shots/honnete-gratuit-bas.png' });
await o.ctx.close();

await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill(); process.exit(code);
