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
async function ouvrir(plan, dossier, nom, repasBanc) {
  const ctx = await nav.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true,locale:'fr-BE'});
  await ctx.addInitScript(([p, d, w, rb]) => {
    localStorage.clear();
    if (rb) localStorage.setItem('belfit_v2_apercu_repas', JSON.stringify(rb));
    if (p) localStorage.setItem('belfit_v2_apercu_programme', JSON.stringify(p));
    localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify(d));
    localStorage.setItem('belfit_v2_apercu_stats', JSON.stringify({ histoJours: {}, weightLog: w }));
  }, [plan, dossier, POIDS, repasBanc || null]);
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
// 22/10 : accès nutrition = payeLe + 44 jours, date réelle affichée.
{ const fin = new Date(Date.now()-10*86400000+44*86400000).toLocaleDateString('fr-BE',{day:'numeric',month:'long'});
  ok(t.includes("Accès nutrition jusqu'au "+fin), 'payé : « Accès nutrition jusqu\'au '+fin+' » (payeLe + 44 j)'); }
ok(!/nutrition[^.]*3 mois|3 mois inclus/.test(t), 'payé : plus de « accès nutrition 3 mois »');
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

// 2b) Paye il y a 45 jours : acces ferme (44 j), plus de 60 €
o = await ouvrir({ ...PLAN, livreLe: jours(44) }, { commande: { payeLe: jours(45), type: 'plan' }, questionnaire: { envoyeLe: jours(44) } }, 'ferme-45');
await versSuivi(o.page);
t = await txt(o.page);
ok(!/60 €/.test(t), '45 jours : plus de 60 € (accès fermé)');
ok(!/Accès nutrition jusqu'au/.test(t), '45 jours : plus de date d\'accès');
{ const fin = new Date(Date.now()-45*86400000+44*86400000).toLocaleDateString('fr-BE',{day:'numeric',month:'long'});
  ok(t.includes('Accès nutrition terminé le '+fin+'.'), '45 jours : « Accès nutrition terminé le '+fin+'. »'); }
await defiler(o.page, true); await o.page.screenshot({ path: '/workspace/shots/acces44-termine.png' });
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
ok(!/60 €/.test(t), 'gratuit : pas de 60 €'); ok(/Accès nutrition inclus pendant ton mois payé et les 2 semaines/.test(t) && !/nutrition[^.]*3 mois|3 mois inclus/.test(t), 'gratuit : accès nutrition mois + 2 semaines, plus de « 3 mois »');
ok(!/Mon suivi/.test(t), 'gratuit : pas de bouton Mon suivi');
await o.page.screenshot({ path: '/workspace/shots/honnete-gratuit-haut.png' });
await defiler(o.page, true); await o.page.screenshot({ path: '/workspace/shots/honnete-gratuit-bas.png' });
await o.ctx.close();

// 6) 22/10 : repas du plan semes seuls sur Aujourd'hui en « Prévu », coche / decoche (DONNEES FICTIVES).
{
  const VIDE = [
    { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ouvert: false, ings: [] },
    { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ouvert: false, ings: [] },
    { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ouvert: false, ings: [] },
    { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ouvert: false, ings: [] } ];
  const PLANR = { ...PLAN, kcal: 2222, livreLe: jours(0), repas: [
    { nom: 'Petit-déjeuner', ings: [{ name: 'Flocons avoine', portion: 80 }, { name: 'Banane', portion: 120 }] },
    { nom: 'Déjeuner', ings: [{ name: 'Riz cuit', portion: 150 }, { name: 'Poulet cuit', portion: 130 }] },
    { nom: 'Dîner', ings: [{ name: 'Brocoli', portion: 200 }, { name: 'Saumon cuit', portion: 120 }] } ] };
  const DOS = { commande: { payeLe: jours(3) }, questionnaire: { envoyeLe: jours(5) } };
  const etat = (p) => p.evaluate(() => window.__banc.repas.value.map(r => ({ nom: r.nom, n: r.ings.length, prevu: !!r.prevu, duPlan: !!r.duPlan, ings: r.ings.map(i => i.name).join('+') })));

  // 6a) jour vierge apres livraison : arrivee seule, sans passer par Coach.
  o = await ouvrir(PLANR, DOS, 'seme', VIDE);
  const p = o.page;
  await p.goto('http://localhost:8092/app.html'); await p.waitForTimeout(2600);
  let e = await etat(p);
  ok(e.filter(r => r.duPlan && r.prevu).length === 3, 'semis : 3 repas du plan en Prévu sans ouvrir Coach (' + JSON.stringify(e.map(r => r.nom + ':' + r.prevu)) + ')');
  ok(e.some(r => r.nom === 'Collations' && r.n === 0), 'semis : collations vides laissées en place');
  ok(/"belfit_v2_plan_seme_test"/.test(JSON.stringify(Object.keys(await p.evaluate(() => ({ ...localStorage }))))), 'semis : marque du jour posée');
  const kcal = async () => { await p.waitForTimeout(1600); return Number((await p.locator('.cal-cote-val').first().innerText()).replace(/\D/g, '')); };
  const vers = async () => { await p.locator('.mc').nth(1).scrollIntoViewIfNeeded(); await p.waitForTimeout(500); };
  const coches = p.locator('.mc-coche');
  ok(await coches.count() === 3, 'coche : une coche par repas du plan (' + await coches.count() + ')');
  const k0 = await kcal(); ok(k0 === 0, 'coche : repas prévus hors cadran (' + k0 + ')');
  const obj = await p.evaluate(() => document.body.innerText); ok(/2\s?222/.test(obj), 'semis : objectif du jour = plan (2222)');
  const sous = await p.locator('.mc-sous').nth(1).innerText(); const kRepas = Number(sous.replace(/[^\d]/g, ''));
  ok(/Prévu · \d+ kcal/.test(sous) && kRepas > 0, 'coche : « ' + sous + ' » (kcal réels)');
  await vers(); await p.screenshot({ path: '/workspace/shots/coche-prevu-avant.png' });
  await coches.nth(1).click(); const k1 = await kcal();
  ok(k1 === kRepas, 'coche : le cadran reçoit le déjeuner (' + k1 + ' = ' + kRepas + ')');
  ok(await coches.nth(1).getAttribute('aria-checked') === 'true' && !/Prévu/.test(await p.locator('.mc-sous').nth(1).innerText()), 'coche : état coché, plus « Prévu »');
  ok(await p.locator('.rp-total-fin').count() === 0, 'coche : MealPage pas ouverte');
  const st = await p.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('belfit_v2_journal')); return k ? localStorage.getItem(k) : ''; });
  ok(/"duPlan":true/.test(st), 'coche : duPlan sauvegardé avec le journal');
  await vers(); await p.screenshot({ path: '/workspace/shots/coche-prevu-coche.png' });
  await coches.nth(1).click(); const k2 = await kcal();
  ok(k2 === 0 && await coches.nth(1).getAttribute('aria-checked') === 'false' && /Prévu/.test(await p.locator('.mc-sous').nth(1).innerText()), 'décoche : retour en prévu, cadran à 0 (' + k2 + ')');
  await vers(); await p.screenshot({ path: '/workspace/shots/coche-prevu-decoche.png' });

  // 6b) meme jour, reouverture du bouton Coach : re-seme sans casser le dejeuner coche.
  await coches.nth(1).click(); await p.waitForTimeout(400);
  await p.goto('http://localhost:8092/app.html?onglet=premium'); await p.waitForTimeout(400);
  // (rechargement = addInitScript remet le banc a VIDE : on recree la saisie apres chargement)
  await p.waitForTimeout(1800);
  await p.evaluate(() => { window.__banc.repas.value = window.__banc.repas.value.map(r => r.nom === 'Dîner' ? { ...r, prevu: false, duPlan: false, ings: [{ id: 9001, name: 'Lentilles cuites', portion: 200 }] } : r.nom === 'Déjeuner' ? { ...r, prevu: false } : r); });
  await p.locator('button', { hasText: /Voir (tout )?mon plan/ }).first().click(); await p.waitForTimeout(1200);
  await p.locator('.bp-appliquer').click(); await p.waitForTimeout(600);
  e = await etat(p);
  ok(e.find(r => r.nom === 'Dîner').ings === 'Lentilles cuites' && !e.find(r => r.nom === 'Dîner').prevu, 'bouton Coach : dîner saisi par le client intact');
  ok(e.find(r => r.nom === 'Déjeuner').prevu === false, 'bouton Coach : déjeuner validé reste validé');
  ok(e.filter(r => r.nom === 'Dîner').length === 1 && e.length === 4, 'bouton Coach : aucun doublon (' + e.length + ' repas)');
  await o.ctx.close();

  // 6c) jour deja rempli par le client avant la livraison : rien d'ecrase, seuls les manquants arrivent.
  const REMPLI = [
    { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ouvert: false, ings: [{ id: 11, name: 'Banane', portion: 100 }] },
    { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ouvert: false, ings: [] },
    { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ouvert: false, ings: [{ id: 31, name: 'Lentilles cuites', portion: 250 }] },
    { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ouvert: false, ings: [] } ];
  o = await ouvrir(PLANR, DOS, 'rempli', REMPLI);
  await o.page.goto('http://localhost:8092/app.html'); await o.page.waitForTimeout(2600);
  e = await etat(o.page);
  ok(e.find(r => r.nom === 'Petit déjeuner').ings === 'Banane' && !e.find(r => r.nom === 'Petit déjeuner').prevu, 'pas d\'écrasement : petit-déj du client intact');
  ok(e.find(r => r.nom === 'Dîner').ings === 'Lentilles cuites' && !e.find(r => r.nom === 'Dîner').prevu, 'pas d\'écrasement : dîner du client intact');
  ok(e.find(r => r.nom === 'Déjeuner').prevu && e.find(r => r.nom === 'Déjeuner').ings === 'Riz cuit+Poulet cuit', 'pas d\'écrasement : déjeuner vide complété en Prévu');
  ok(e.length === 4, 'pas d\'écrasement : aucun doublon (' + e.length + ')');
  await o.page.screenshot({ path: '/workspace/shots/seme-jour-rempli.png' });

  // 6d) journee suivante (cloture -> dateJour change, journal vierge) : re-semis.
  await o.page.evaluate((v) => { window.__banc.repas.value = JSON.parse(v); window.__banc.dateJour.value = '2099-01-02'; }, JSON.stringify(VIDE));
  await o.page.waitForTimeout(900);
  e = await etat(o.page);
  ok(e.filter(r => r.duPlan && r.prevu).length === 3, 'jour suivant : plan re-semé (' + e.filter(r => r.prevu).length + ')');
  // meme jour, client vide un repas du plan apres coup : pas de re-semis (marque du jour)
  await o.page.evaluate(() => { window.__banc.repas.value = window.__banc.repas.value.filter(r => r.nom !== 'Dîner'); });
  await o.page.waitForTimeout(700);
  ok(!(await etat(o.page)).some(r => r.nom === 'Dîner'), 'même jour : un repas retiré par le client ne revient pas');

  // 6e) nouvelle livraison (livreLe neuf) : s'applique des aujourd'hui, meme regle.
  await o.page.evaluate(() => { window.__banc.repas.value = window.__banc.repas.value.map(r => r.nom === 'Déjeuner' ? { ...r, prevu: false } : r); });
  await o.page.evaluate((lv) => { const b = window.__banc.programme; b.value = { ...b.value, livreLe: lv, repas: [
    { nom: 'Petit-déjeuner', ings: [{ name: 'Flocons avoine', portion: 60 }] },
    { nom: 'Déjeuner', ings: [{ name: 'Riz cuit', portion: 200 }] },
    { nom: 'Dîner', ings: [{ name: 'Saumon cuit', portion: 150 }, { name: 'Brocoli', portion: 150 }] } ] }; }, new Date().toISOString());
  await o.page.waitForTimeout(900);
  e = await etat(o.page);
  ok(e.find(r => r.nom === 'Petit-déjeuner')?.ings === 'Flocons avoine' && e.find(r => r.nom === 'Petit-déjeuner').prevu, 'nouvelle livraison : prévu remplacé par le nouveau plan');
  ok(e.find(r => r.nom === 'Déjeuner').ings === 'Riz cuit+Poulet cuit' && !e.find(r => r.nom === 'Déjeuner').prevu, 'nouvelle livraison : repas déjà coché intact');
  ok(e.find(r => r.nom === 'Dîner')?.ings === 'Saumon cuit+Brocoli', 'nouvelle livraison : repas manquant ajouté');
  await o.ctx.close();

  o = await ouvrir(null, { commande: null, questionnaire: null }, 'sans-plan');
  await o.page.locator('.bn-item').first().click(); await o.page.waitForTimeout(1500);
  ok(await o.page.locator('.mc-coche').count() === 0, 'sans plan : aucune coche, journal inchangé');
  await o.ctx.close();
}

// 7) 22/10 : trois issues d'un repas du plan — mangé / sauté / mangé autre chose, et retour (DONNEES FICTIVES).
{
  const VIDE7 = [
    { id: 1, nom: 'Petit déjeuner', type: 'repas', cle: 'pdej', fixe: true, ouvert: false, ings: [] },
    { id: 2, nom: 'Déjeuner', type: 'repas', cle: 'dej', fixe: true, ouvert: false, ings: [] },
    { id: 3, nom: 'Dîner', type: 'repas', cle: 'diner', fixe: true, ouvert: false, ings: [] },
    { id: 4, nom: 'Collations', type: 'collation', cle: 'snack', fixe: true, ouvert: false, ings: [] } ];
  const PL7 = { ...PLAN, kcal: 2222, livreLe: jours(0), repas: [
    { nom: 'Petit-déjeuner', ings: [{ name: 'Flocons avoine', portion: 80 }, { name: 'Banane', portion: 120 }] },
    { nom: 'Déjeuner', ings: [{ name: 'Riz cuit', portion: 150 }, { name: 'Poulet cuit', portion: 130 }] },
    { nom: 'Dîner', ings: [{ name: 'Brocoli', portion: 200 }, { name: 'Saumon cuit', portion: 120 }] } ] };
  o = await ouvrir(PL7, { commande: { payeLe: jours(3) }, questionnaire: { envoyeLe: jours(5) } }, 'choix', VIDE7);
  const p = o.page;
  await p.goto('http://localhost:8092/app.html'); await p.waitForTimeout(2600);
  const kcal = async () => { await p.waitForTimeout(1500); return Number((await p.locator('.cal-cote-val').first().innerText()).replace(/\D/g, '')); };
  const dej = () => p.locator('.mc').nth(1);
  const r1 = () => p.evaluate(() => { const r = window.__banc.repas.value[1]; return { prevu: !!r.prevu, saute: !!r.saute, remplace: !!r.remplace, duPlan: !!r.duPlan, ings: r.ings.map(i => i.name).join('+'), plan: (r.ingsPlan || []).map(i => i.name).join('+') }; });
  const vers = async () => { await dej().scrollIntoViewIfNeeded(); await p.waitForTimeout(500); };
  ok(await p.locator('.mc-plus').count() === 3 && await p.locator('.mc-coche').count() === 3, 'choix : ✓ et ⋯ sur chaque repas prévu du plan');
  ok(await p.locator('.mc-crayon').count() === 1, 'choix : crayon remplacé par ⋯ sur les repas du plan (reste sur Collations)');
  await vers(); await p.screenshot({ path: '/workspace/shots/choix-repas-prevu.png' });
  // menu
  await dej().locator('.mc-plus').click(); await p.waitForTimeout(300);
  ok(await dej().locator('.mc-choix-btn').count() === 3 && await dej().locator('.mc-plus').getAttribute('aria-expanded') === 'true', 'menu : Sauté / Mangé autre chose / Renommer');
  const hb = await dej().locator('.mc-choix-btn').first().boundingBox(); ok(hb.height >= 44, 'menu : cibles ≥ 44 px (' + Math.round(hb.height) + ')');
  await vers(); await p.screenshot({ path: '/workspace/shots/choix-repas-menu.png' });
  // saute
  await dej().locator('.mc-choix-btn', { hasText: 'Sauté' }).click(); await p.waitForTimeout(300);
  let e = await r1(); ok(e.saute && !e.prevu && e.duPlan, 'sauté : saute:true, plus prévu');
  ok(/Sauté · 0 kcal/.test(await dej().locator('.mc-sous').innerText()) && await dej().evaluate(n => n.classList.contains('mc--saute')), 'sauté : carte grisée « Sauté · 0 kcal »');
  ok(await kcal() === 0, 'sauté : cadran à 0');
  const st = await p.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('belfit_v2_journal')); return k ? localStorage.getItem(k) : ''; });
  ok(/"saute":true/.test(st), 'sauté : persisté avec le journal');
  await vers(); await p.screenshot({ path: '/workspace/shots/choix-repas-saute.png' });
  // semis ne touche pas un saute (nouvelle livraison le meme jour)
  await p.evaluate(() => { const b = window.__banc.programme; b.value = { ...b.value, livreLe: new Date(Date.now() + 1000).toISOString() }; }); await p.waitForTimeout(700);
  e = await r1(); ok(e.saute, 'semis : un repas sauté n\'est jamais écrasé');
  await dej().locator('.mc-annuler').click(); await p.waitForTimeout(300);
  e = await r1(); ok(e.prevu && !e.saute && e.ings === 'Riz cuit+Poulet cuit', 'sauté → retour en Prévu en un geste');
  // mange (✓) + retour deja couverts au cas 6 ; verif rapide
  await dej().locator('.mc-coche').click(); const kM = await kcal(); ok(kM > 0, 'mangé : le cadran reçoit le repas (' + kM + ')');
  await dej().locator('.mc-coche').click(); ok(await kcal() === 0, 'mangé → retour en Prévu');
  // mange autre chose : abandon sans rien noter -> redevient prevu
  await dej().locator('.mc-plus').click(); await dej().locator('.mc-choix-btn', { hasText: 'autre' }).click(); await p.waitForTimeout(800);
  ok(await p.locator('.rp-titre').count() === 1, 'autre : la page du repas s\'ouvre');
  e = await r1(); ok(e.remplace && e.prevu && e.ings === '' && e.plan === 'Riz cuit+Poulet cuit', 'autre : aliments du plan mis de côté, page vide');
  await p.locator('.rp-retour').click(); await p.waitForTimeout(800);
  e = await r1(); ok(!e.remplace && e.prevu && e.ings === 'Riz cuit+Poulet cuit', 'autre : quitter sans noter → redevient le prévu du plan');
  // mange autre chose : on note Lentilles cuites + Riz cuit et Terminer
  await dej().locator('.mc-plus').click(); await dej().locator('.mc-choix-btn', { hasText: 'autre' }).click(); await p.waitForTimeout(800);
  await p.evaluate(() => { const b = window.__banc.repas; b.value = b.value.map((r, k) => k === 1 ? { ...r, ings: [{ id: 7001, name: 'Lentilles cuites', portion: 200 }, { id: 7002, name: 'Riz cuit', portion: 100 }] } : r); });
  await p.waitForTimeout(400); await p.locator('.rp-total-fin').click(); await p.waitForTimeout(900);
  e = await r1(); ok(e.remplace && !e.prevu && e.duPlan && e.ings === 'Lentilles cuites+Riz cuit', 'autre : enregistré comme repas validé (duPlan + remplace gardés)');
  const kA = await kcal(); ok(kA > 0 && /Autre chose · \d+ kcal/.test(await dej().locator('.mc-sous').innerText()), 'autre : « Autre chose » compte dans le cadran (' + kA + ')');
  await p.evaluate(() => { const b = window.__banc.programme; b.value = { ...b.value, livreLe: new Date(Date.now() + 5000).toISOString() }; }); await p.waitForTimeout(700);
  e = await r1(); ok(e.remplace && e.ings === 'Lentilles cuites+Riz cuit', 'semis : un repas remplacé n\'est jamais écrasé');
  await vers(); await p.screenshot({ path: '/workspace/shots/choix-repas-autre.png' });
  await dej().locator('.mc-annuler').click(); await p.waitForTimeout(300);
  e = await r1(); ok(e.prevu && !e.remplace && e.ings === 'Riz cuit+Poulet cuit' && await kcal() === 0, 'autre → retour au Prévu du plan en un geste');
  await o.ctx.close();
}

await nav.close(); try { process.kill(-srv.pid); } catch {} srv.kill(); process.exit(code);
