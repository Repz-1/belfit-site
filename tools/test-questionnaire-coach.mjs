// Test du parcours coach complet (26/09, questionnaire v2 d'apres la
// banque de Raci). Depuis la racine : node tools/test-questionnaire-coach.mjs
// Prerequis : apercu construit avec COMMANDES_OUVERTES = true.
import { spawn } from 'child_process';
import { createRequire } from 'module';
const { chromium } = createRequire(new URL('../app-v2/package.json', import.meta.url))('playwright');
const PORT = 8095;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'app-v2/apercu/construit'], { stdio: 'ignore', detached: true });
srv.unref(); await new Promise(r => setTimeout(r, 1500));
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const RETOUR = `http://localhost:${PORT}/app.html?onglet=premium&coach=questionnaire&type=`;
async function page(prepa, arg) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'fr-BE' });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  p.on('pageerror', e => ok(false, 'erreur JS ' + e.message));
  // Depuis Mollie (v646), le retour de paiement est confirme par le serveur
  // (mollieEtat) avant d'ouvrir le questionnaire : reponse simulee « payé ».
  await p.route('**/mollieEtat', r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ paiement: { statut: 'paid', activee: true } }) }));
  await p.goto(`http://localhost:${PORT}/app.html`);
  await p.evaluate(prepa || (() => localStorage.clear()), arg);
  return p;
}
const clicEcran = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s)].find(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.left < 390 && r.width > 0; }).click(), sel);
// Remplit la section affichee : premier choix, compteurs, echelles, textes.
async function remplir(p) {
  const cartes = p.locator('.pg-qc .qc-ouvert .qc-carte:has(.qc-label)');
  for (let k = 0; k < await cartes.count(); k++) {
    const c = cartes.nth(k);
    if (await c.getAttribute('data-facultatif') !== null) continue;
    if (await c.locator('.qc-alim').count()) {
      const cats = c.locator('.qc-alim-cat');
      for (let j = 0; j < await cats.count(); j++) {
        const cat = cats.nth(j); const min = +(await cat.getAttribute('data-min')) || 0;
        for (let x = await cat.locator('.qc-puce.on').count(); x < min; x++) await cat.locator('.qc-puce:not(.on)').first().tap();
      }
      continue;
    }
    if (await c.locator('.qc-tuile, .qc-puce').count()) { if (!(await c.locator('.qc-tuile.on, .qc-puce.on').count())) await c.locator('.qc-tuile, .qc-puce').first().tap(); continue; }
    if (await c.locator('.qc-roulette').count()) { if (!(await c.locator('.qc-roulette .on').count())) await c.locator('.qc-roulette button').nth(3).tap(); continue; }
    if (await c.locator('.qc-saisie').count()) {
      const lab = await c.locator('.qc-label').innerText();
      if (!(await c.locator('.qc-saisie input').inputValue())) await c.locator('.qc-saisie input').fill(/Taille/.test(lab) ? '175' : /Âge/.test(lab) ? '30' : '75');
      continue;
    }
    if (await c.locator('.qc-num').count()) { if (!(await c.locator('.qc-num input').inputValue())) await c.locator('.qc-num button').last().tap(); continue; }
    if (await c.locator('.qc-echelle').count()) { if (!(await c.locator('.qc-echelle .on').count())) await c.locator('.qc-echelle button').nth(6).tap(); continue; }
    const champ = c.locator('.qc-champ');
    if (await champ.count() && !(await champ.first().inputValue())) {
      await champ.first().fill((await champ.first().getAttribute('type')) === 'date' ? '2026-12-31' : 'texte');
    }
  }
}
const continuer = async p => { await p.locator('.pg-qc .qc-bloc .qc-cta').tap(); await p.waitForTimeout(250); };
// Section ouverte dans la liste (27/09 : plus d'ecran separe par section).
const haut = p => p.locator('.qc-bloc .qc-ligne-nom').innerText().catch(() => '');

try {
  // 1) Avant paiement
  let p = await page();
  await p.reload(); await p.waitForTimeout(1800);
  await p.locator('.bn-item').last().tap(); await p.waitForTimeout(600);
  await p.locator('.cp-bt', { hasText: 'Demander mon plan' }).tap(); await p.waitForTimeout(300);
  const m = p.locator('.cp-modale');
  ok(await m.locator('.cp-q').count() === 2, 'deux questions eliminatoires');
  await m.locator('.cp-oui-non').nth(0).locator('.qc-chip', { hasText: 'Non' }).tap();
  ok(/réservé aux 18 ans/.test(await m.innerText()), 'moins de 18 ans : bloque');
  await m.locator('.cp-oui-non').nth(0).locator('.qc-chip', { hasText: 'Oui' }).tap();
  await m.locator('.cp-oui-non').nth(1).locator('.qc-chip', { hasText: 'Oui' }).tap();
  ok(/professionnel qui te suit/.test(await m.innerText()), 'trouble alimentaire suivi : bloque');
  await m.locator('.cp-oui-non').nth(1).locator('.qc-chip', { hasText: 'Non' }).tap();
  const go = m.locator('.cp-bt--or', { hasText: 'paiement' });
  await m.locator('.cp-consent input').nth(0).check();
  ok(await go.isDisabled(), 'une case ne suffit pas');
  await m.locator('.cp-consent input').nth(1).check();
  ok(!(await go.isDisabled()), 'deux cases : paiement possible');
  await p.context().close();

  // 2) Retour de paiement -> accueil du questionnaire
  p = await page();
  await p.goto(RETOUR + 'plan'); await p.waitForTimeout(1800);
  ok(/Ton programme commence ici/.test(await p.locator('.pg-qc').innerText()), 'retour de paiement : accueil du questionnaire');
  ok(await p.locator('.qc-ligne').count() === 12, '11 sections + bonus listees');
  ok(!/arrêter quand tu veux/.test(await p.locator('.pg-qc').innerText()), 'accueil : phrase « tu peux t\'arreter » retiree');
  ok(await p.locator('.qc-bloc').count() === 1 && /^Toi/.test(await haut(p)), 'accueil : premiere section deja ouverte');
  ok(await p.locator('.pg-qc > .qc-cta').count() === 0, 'accueil : pas de bouton Commencer');
  ok((await p.locator('.qc-ouvert .qc-carte:has-text("E-mail") .qc-champ').inputValue()).includes('@'), 'e-mail prerempli depuis le compte');
  await continuer(p);
  ok(await p.locator('.qc-carte--err').count() > 0 && /^Toi/.test(await haut(p)), 'bloque tant que manque une reponse');
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Sexe") .qc-tuile').count() === 2, 'sexe : homme ou femme seulement');
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("tutoie")').count() === 0, 'plus de question tutoiement');
  await p.locator('.qc-ouvert .qc-carte:has-text("Sexe") .qc-tuile', { hasText: 'Homme' }).tap();
  await p.locator('.qc-ouvert .qc-carte:has-text("connus") .qc-puce', { hasText: 'Autre' }).tap();
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("connus") .qc-champ').count() === 0, '« Autre » sans champ a preciser');
  ok(await p.locator('.qc-fac').count() === 0 && !/facultatif/.test(await p.locator('.qc-ouvert').innerText()), 'questions facultatives sans le mot « facultatif »');
  await remplir(p); await continuer(p);
  ok(/^Ton objectif/.test(await haut(p)) && await p.locator('.qc-ligne .qc-ok').count() === 1, 'section 1 validee : cochee, la suivante s\'ouvre');
  // Objectif : energie -> question « point le plus urgent »
  await p.locator('.qc-tuile', { hasText: 'Énergie et santé' }).tap();
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("plus urgent")').count() === 1, 'energie et sante : point le plus urgent');
  await p.locator('.qc-tuile', { hasText: 'Perdre du gras' }).tap();
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("plus urgent")').count() === 0, 'perdre du gras : question masquee');
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Pourquoi maintenant")').count() === 0, 'plus de « pourquoi maintenant »');
  ok(await p.locator('.qc-label', { hasText: /^Poids que tu vises/ }).count() === 1 && !(/sens pour toi/.test(await p.locator('.pg-qc').innerText())), 'poids vise sans parenthese');
  await p.locator('.qc-ouvert .qc-carte:has-text("Motivation") .qc-echelle button').nth(7).tap();
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Motivation") .qc-echelle .on').innerText() === '8', 'echelle 1 a 10');
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Motivation") .qc-echelle .on').evaluate(e => { const d = document.createElement('i'); d.style.background = 'var(--pastel)'; e.appendChild(d); const v = getComputedStyle(d).backgroundColor; d.remove(); return v !== 'rgba(0, 0, 0, 0)' && getComputedStyle(e).backgroundColor === v; }), 'echelle : chiffre choisi en vert pastel (charte claire)');
  await remplir(p); await continuer(p);
  // Mesures : compteur
  const poids = p.locator('.qc-ouvert .qc-carte:has-text("Poids actuel")');
  ok(await poids.locator('.qc-saisie input').count() === 1 && await poids.locator('.qc-num').count() === 0, 'poids : saisie directe, sans + / -');
  await poids.locator('.qc-saisie input').fill('75.5');
  ok(!(/plus bas|plus haut|sentais bien/.test(await p.locator('.pg-qc').innerText())), 'poids passes retires');
  await remplir(p); await continuer(p);
  // Rythme : roulette, info batch, materiel
  const rv = p.locator('.qc-ouvert .qc-carte:has-text("hors collations")');
  ok(await rv.locator('.qc-roulette button').count() === 10, 'repas voulus : roulette 1 a 10');
  await rv.locator('.qc-roulette button', { hasText: /^6$/ }).tap(); await p.waitForTimeout(500);
  ok(await rv.locator('.qc-roulette .on').innerText() === '6', 'roulette : appui = choix');
  await p.locator('.qc-ouvert .qc-carte:has-text("batch") .qc-info').tap();
  ok(/cuisiner en une fois plusieurs repas/.test(await p.locator('.qc-info-txt').innerText()), 'batch : explication au clic');
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("hors domicile") .qc-puce', { hasText: /^Aucun$/ }).count() === 1, 'repas hors domicile : « Aucun »');
  const mat = p.locator('.qc-ouvert .qc-carte:has-text("Matériel dispo")');
  ok(await mat.locator('.qc-puce', { hasText: 'vraie cuisine' }).count() === 0, 'materiel : « pas de vraie cuisine » retire');
  await mat.locator('.qc-puce', { hasText: 'Four' }).tap();
  await mat.locator('.qc-puce', { hasText: 'Cuisine complète' }).tap();
  ok(await mat.locator('.qc-puce.on').count() === 1, 'cuisine complete : choix exclusif');
  await remplir(p); await continuer(p);
  // Entrainement : 0 seance masque les details
  const se = p.locator('.qc-ouvert .qc-carte:has-text("Séances par semaine")');
  ok(await se.locator('.qc-roulette button').count() === 15, 'seances : roulette 0 a 14');
  await se.locator('.qc-roulette button', { hasText: /^0$/ }).tap(); await p.waitForTimeout(500);
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Durée typique")').count() === 0, '0 seance : details masques');
  await se.locator('.qc-roulette button', { hasText: /^4$/ }).tap(); await p.waitForTimeout(500);
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Durée typique")').count() === 1, '4 seances : details affiches');
  ok(!(/changer les jours|Blessure/.test(await p.locator('.pg-qc').innerText())), 'jours d\'entrainement et blessure retires');
  await remplir(p); await continuer(p);
  // Alimentation : allergie -> lesquelles + reaction grave
  await p.locator('.qc-tuile', { hasText: 'Oui' }).tap();
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Lesquelles")').count() === 1, 'allergie oui : lesquelles');
  await p.locator('.qc-ouvert .qc-carte:has-text("Lesquelles") .qc-puce', { hasText: 'Fruits à coque' }).tap();
  await p.locator('.qc-ouvert .qc-carte:has-text("que se passe") .qc-puce', { hasText: 'Gonflement' }).tap();
  ok(await p.locator('.qc-alerte-rouge').count() === 1, 'reaction grave : alerte rouge');
  await remplir(p); await continuer(p);
  // Tes aliments (28/09) : au moins 3 par categorie principale, recherche dans la base
  ok(/^Tes aliments/.test(await haut(p)) && await p.locator('.qc-alim-cat').count() === 6, 'tes aliments : 6 categories');
  await continuer(p);
  ok(/^Tes aliments/.test(await haut(p)), 'tes aliments : bloque sous 3 par categorie');
  await p.locator('.qc-alim-cherche input').fill('saumon fum'); await p.waitForTimeout(200);
  ok(await p.locator('.qc-alim-props button').count() > 0, 'recherche dans la base');
  await p.locator('.qc-alim-props button').first().tap(); await p.waitForTimeout(150);
  ok(await p.locator('.qc-alim-autres .qc-puce').count() === 1, 'aliment de la base ajoute');
  await remplir(p); await continuer(p);
  // Boissons : sodas sucres -> combien ; alcool 0
  await p.locator('.qc-ouvert .qc-carte:has-text("des sodas") .qc-puce', { hasText: 'Oui' }).tap();
  await p.locator('.qc-ouvert .qc-carte:has-text("light ou") .qc-puce', { hasText: 'Sucrés' }).tap();
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Combien de sodas")').count() === 1, 'sodas sucres : combien');
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Alcool par semaine")').count() === 0, 'alcool par semaine retire');
  await remplir(p); await continuer(p);
  ok(!(/Tu es plutôt|Pesée/.test(await p.locator('.pg-qc').innerText())), 'style et pesee retires');
  // Difficultes : regime non -> pourquoi
  await p.locator('.qc-ouvert .qc-carte:has-text("essayé un régime") .qc-puce', { hasText: 'Oui' }).tap();
  await p.locator('.qc-ouvert .qc-carte:has-text("fonctionné ?") .qc-puce', { hasText: /^Oui/ }).first().tap();
  const reg = await p.locator('.qc-ouvert .qc-carte:has-text("Quel(s) régime")').innerText();
  ok(/Coach/.test(reg) && !/GLP-1|Coach déjà/.test(reg), 'regimes : « Coach », sans GLP-1');
  await p.locator('.qc-ouvert .qc-carte:has-text("fonctionné ?") .qc-puce', { hasText: /^Non/ }).first().tap();
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Pourquoi ça n")').count() === 1, 'regime rate : pourquoi');
  await remplir(p); await continuer(p);
  // Sante : homme -> pas de grossesse ; suivi -> traitements
  ok(await p.locator('.qc-puce', { hasText: 'Grossesse' }).count() === 0, 'homme : pas de grossesse proposee');
  await p.locator('.qc-ouvert .qc-carte:has-text("médecin") .qc-puce', { hasText: 'Thyroïde' }).tap();
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Traitements prescrits")').count() === 1, 'suivi medical : traitements demandes');
  await p.locator('.qc-ouvert .qc-carte:has-text("Traitements prescrits") .qc-champ').fill('Levothyrox 50');
  await p.locator('.qc-ouvert .qc-carte:has-text("Trouble alimentaire") .qc-puce', { hasText: 'Antérieur' }).tap();
  ok(await p.locator('.qc-ouvert .qc-carte:has-text("Lequel")').count() === 1, 'trouble alimentaire : lequel ?');
  await remplir(p); await continuer(p);
  await remplir(p); await continuer(p);  // sommeil
  ok(/facultatif/.test(await haut(p)), 'bonus facultatif');
  await p.locator('.qc-passer').tap(); await p.waitForTimeout(300);
  ok(/Tout est bon/.test(await p.locator('.pg-qc').innerText()), 'recapitulatif');
  const rec = await p.locator('.pg-qc').innerText();
  ok(/Autre/.test(rec) && /Levothyrox/.test(rec) && /75.5 kg/.test(rec), 'recap reprend les reponses');
  ok(await p.locator('.qc-alerte').count() === 1, 'alerte sante au recap');
  const envoyer = p.locator('.qc-cta', { hasText: 'Envoyer' });
  ok(await p.locator('.qc-consent input').count() === 3 && await p.locator('.qc-consent input:checked').count() === 0, '3 consentements, decoches');
  ok(await envoyer.isDisabled(), 'envoi grise sans les cases');
  await p.locator('.qc-consent input').nth(0).check(); await p.locator('.qc-consent input').nth(1).check();
  ok(await envoyer.isDisabled(), 'deux cases ne suffisent pas');
  ok(/confidentialite\.html/.test(await p.locator('.qc-consent a').first().getAttribute('href')), 'lien confidentialite');
  ok((await p.locator('.qc-consent a').evaluateAll(a => a.map(x => x.getAttribute('href')))).join(' ') === '/confidentialite.html /cgv.html#cgv /cgv.html#faq', 'liens CGV et FAQ');
  // Brouillon : quitter et revenir
  await p.reload(); await p.waitForTimeout(1800);
  await p.locator('.bn-item').last().tap(); await p.waitForTimeout(500);
  ok(/Paiement reçu/.test(await p.locator('.pg-coach').innerText()), 'paye sans envoi : carte « Paiement recu »');
  await p.locator('.cp-bt', { hasText: 'Compléter mon questionnaire' }).tap(); await p.waitForTimeout(400);
  ok(await p.locator('.qc-ok').count() >= 9, 'accueil : sections faites cochees');
  await p.locator('.qc-cta', { hasText: 'récapitulatif' }).tap(); await p.waitForTimeout(300);
  for (let k = 0; k < 3; k++) await p.locator('.qc-consent input').nth(k).check();
  await p.locator('.qc-cta', { hasText: 'Envoyer' }).tap(); await p.waitForTimeout(500);
  const att = await p.locator('.pg-coach').innerText();
  ok(/Ton plan arrive/.test(att) && /Livraison au plus tard/.test(att), 'envoye : ecran « Ton plan arrive »');
  ok(await p.locator('.pp-et').count() === 5 && /≈ 4[78] h restantes/.test(att), 'suivi en 5 etapes, ≈ 48 h restantes');
  ok(await p.locator('.pp-et.c', { hasText: "en cours d'élaboration" }).count() === 1, 'etape elaboration en cours');
  await p.locator('.pp-lien', { hasText: 'Revoir mes réponses' }).tap(); await p.waitForTimeout(300);
  ok(/Levothyrox/.test(await p.locator('.pp-reponses').innerText()), 'revoir mes reponses : lecture seule');
  await p.locator('.pp-reponses .cp-bt').tap(); await p.waitForTimeout(200);
  ok(/mailto:contact@belfit.be/.test(await p.locator('.pp-mail').getAttribute('href')), 'ecrire a mon coach : e-mail');
  const env = await p.evaluate(() => JSON.parse(localStorage.getItem('belfit_qc_dernier') || 'null'));
  ok(env && env.alerteSante && env.allergieGrave && env.consentements.k1 && env.consentements.k3 && env.reponses.source.texte === 'Autre', 'envoi : reponses, alertes et consentements');
  await p.context().close();

  // 3) Bandeau + 7 jours
  p = await page(v => { localStorage.clear(); localStorage.setItem('belfit_qc_paye', JSON.stringify({ type: 'plan', le: v, uid: 'test' })); }, new Date(Date.now() - 2 * 86400000).toISOString());
  await p.reload(); await p.waitForTimeout(1800);
  ok(/5 jours restants/.test(await p.locator('.bandeau-coach:visible').first().innerText()), 'bandeau : 5 jours restants');
  await clicEcran(p, '.bandeau-coach'); await p.waitForTimeout(700);
  ok(await p.locator('.pg-qc').count() === 1, 'bandeau : ouvre le questionnaire');
  await p.evaluate(v => localStorage.setItem('belfit_qc_paye', JSON.stringify({ type: 'plan', le: v, uid: 'test' })), new Date(Date.now() - 10 * 86400000).toISOString());
  await p.reload(); await p.waitForTimeout(1800);
  ok(/rejoint la file/.test(await p.locator('.bandeau-coach:visible').first().innerText()), 'apres 7 jours : file');
  await p.context().close();

  // 3b) Autre compte sur le meme telephone : n'herite pas du paiement
  p = await page(v => { localStorage.clear(); localStorage.setItem('belfit_qc_paye', JSON.stringify({ type: 'plan', le: v, uid: 'autre-compte' })); }, new Date().toISOString());
  await p.reload(); await p.waitForTimeout(1800);
  ok(await p.locator('.bandeau-coach:visible').count() === 0, 'autre compte : pas de bandeau herite');
  await p.evaluate(v => localStorage.setItem('belfit_qc_paye', JSON.stringify({ type: 'plan', le: v })), new Date().toISOString());
  await p.reload(); await p.waitForTimeout(1800);
  ok(await p.locator('.bandeau-coach:visible').count() === 0, 'ancienne marque sans compte : ignoree');
  await p.context().close();

  // 4) Autre appareil : brouillon Firestore arrive apres l'ouverture
  p = await page(() => { localStorage.clear(); localStorage.setItem('belfit_v2_apercu_dossier', JSON.stringify({ commande: null, questionnaire: null,
    brouillon: { type: 'plan', i: 3, consent: {}, majLe: new Date().toISOString(), rep: { prenom: { valeur: 'Repris' } } } })); });
  await p.goto(RETOUR + 'plan'); await p.waitForTimeout(2000);
  ok(/^Ton rythme/.test(await haut(p)), 'autre appareil : reprise a la section 4, ouverte');
  await p.context().close();

  // 5) Ancien lien « maj » (60 €, supprime le 01/11) : questionnaire complet a 80 €
  p = await page();
  await p.goto(RETOUR + 'maj'); await p.waitForTimeout(1800);
  ok(await p.locator('.qc-ligne').count() === 12, 'ancien lien maj : questionnaire complet (plus de 60 €)');
  await p.context().close();
} catch (e) { ok(false, e.message.split('\n')[0]); }
await nav.close(); try { process.kill(-srv.pid); } catch {}
process.exit(code);
