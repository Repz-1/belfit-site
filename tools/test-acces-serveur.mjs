// Tests purs (sans reseau) : calcul de l'acces nutrition cote serveur + script de migration.
// DONNEES DE TEST uniquement (aucun vrai compte).
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { planifier, finDeJourBruxelles } from './migration-acces-nutrition.mjs';
const exiger = createRequire(import.meta.url);
const A = exiger('../functions/acces-nutrition.js');
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const J = 86400000, now = Date.UTC(2026, 9, 28, 12);

ok(A.accesActif({}, now) === false, 'jamais payé -> fermé');
ok(A.accesActif(null, now) === false, 'document absent -> fermé');
ok(A.accesActif({ accesNutritionJusqu: now - 1 }, now) === false, 'expiré -> fermé');
ok(A.accesActif({ accesNutritionJusqu: now + 1 }, now) === true, 'actif -> ouvert');
ok(A.accesActif({ accesNutritionJusqu: new Date(A.FIN_ILLIMITEE_MS) }, now) === true, 'illimité -> ouvert');
ok(A.accesActif({ accesNutritionJusqu: 'n’importe quoi' }, now) === false, 'valeur illisible -> fermé');
ok(A.nouvelleFin(null, { depuisMs: now }) === now + 44 * J, 'paiement = +44 jours');
ok(A.nouvelleFin(now + 100 * J, { depuisMs: now }) === now + 100 * J, 'un accès plus long n’est jamais raccourci');
ok(A.nouvelleFin(null, { illimite: true }) === A.FIN_ILLIMITEE_MS, 'illimité = 9999-12-31');
ok(A.nouvelleFinJusqu(null, null) === A.FIN_ILLIMITEE_MS, 'offre sans date = sans fin');
ok(A.nouvelleFinJusqu(null, new Date(now + 30 * J).toISOString()) === now + 30 * J, 'offre jusqu’au (date exacte)');

// L'interrupteur : sans document config/acces, rien n'est bloqué.
const dbFaux = (doc) => ({ collection: () => ({ doc: () => ({ get: async () => doc }) }) });
A.oublierCacheBlocage();
ok(await A.blocageActif(dbFaux({ exists: false }), now) === false, 'interrupteur absent -> rien bloqué');
A.oublierCacheBlocage();
ok(await A.blocageActif(dbFaux({ exists: true, data: () => ({ blocage: true }) }), now) === true, 'interrupteur allumé -> blocage');
A.oublierCacheBlocage();
ok(await A.blocageActif({ collection: () => { throw new Error('réseau'); } }, now) === false, 'doute (erreur) -> personne n’est bloqué');

// Migration (dry-run pur).
const fut = new Date(now + 20 * J).toISOString(), pas = new Date(now - 20 * J).toISOString();
const p = planifier([
  { uid: 'u1', email: 'proprio@exemple.test', user: {}, quota: null },
  { uid: 'u2', email: 'a@exemple.test', user: {}, quota: { illimiteJusqu: fut } },
  { uid: 'u3', email: 'b@exemple.test', user: {}, quota: { illimiteJusqu: pas } },
  { uid: 'u4', email: 'c@exemple.test', user: { accesPro: { jusqu: null } }, quota: null },
  { uid: 'u5', email: 'd@exemple.test', user: { premium: true }, quota: null },
  { uid: 'u6', email: 'e@exemple.test', user: { premium: true, premiumJusqu: fut }, quota: null },
  { uid: 'u9', email: 'client@exemple.test', user: {}, quota: null },
  { uid: 'u7', email: 'f@exemple.test', user: {}, quota: null },
  { uid: 'u8', email: 'g@exemple.test', user: { accesNutritionJusqu: new Date(now + 90 * J) }, quota: { illimiteJusqu: fut } },
], { maintenantMs: now, illimites: ['PROPRIO@exemple.test'], clients: [{ email: 'CLIENT@exemple.test', finMs: now + 55 * J }] });
const ec = Object.fromEntries(p.ecrire.map(x => [x.uid, x]));
ok(ec.u1 && ec.u1.fin === A.FIN_ILLIMITEE_MS, 'compte illimité passé en argument -> sans fin');
ok(ec.u2 && ec.u2.fin === Date.parse(fut), 'achat coaching en cours -> même date');
ok(!ec.u3, 'accès déjà terminé -> rien à écrire');
ok(ec.u4 && ec.u4.fin === A.FIN_ILLIMITEE_MS, 'accès offert sans fin -> sans fin');
ok(!ec.u5 && !ec.u6 && !p.aDecider, 'ancien « premium » (avec ou sans date) : ignoré, rien n’est migré ni « à décider »');
ok(!ec.u7, 'jamais payé -> rien');
ok(!ec.u8, 'déjà plus long -> jamais raccourci');
ok(p.ecrire.every(x => !/@exemple\.test$/.test(x.email) || x.email.includes('***')), 'adresses masquées dans la liste');
ok(ec.u9 && ec.u9.fin === now + 55 * J, 'client de coaching à durée fixe (argument) -> la date donnée');
const seul = planifier([
  { uid: 'u1', email: 'proprio@exemple.test', user: {}, quota: null },
  { uid: 'u2', email: 'a@exemple.test', user: {}, quota: { illimiteJusqu: fut } },
  { uid: 'u9', email: 'client@exemple.test', user: {}, quota: null },
], { maintenantMs: now, clients: [{ email: 'client@exemple.test', finMs: now + 55 * J }], seulement: true });
ok(seul.ecrire.length === 1 && seul.ecrire[0].uid === 'u9' && seul.ignorer.length === 0, '--seulement : un seul compte touché, les autres ne sont même pas examinés');
// Fin de plan : « 2026-12-22 » = fin de ce jour a Bruxelles (UTC+1 en decembre) = 23:00 UTC.
ok(finDeJourBruxelles('2026-12-22') === Date.UTC(2026, 11, 22, 23, 0, 0), 'date seule = fin du jour à Bruxelles, incluse (22/12 -> 23/12 00:00)');
ok(finDeJourBruxelles('2026-07-10') === Date.UTC(2026, 6, 10, 22, 0, 0), 'heure d’été gérée (UTC+2)');
ok(finDeJourBruxelles('n’importe quoi') === null, 'date illisible -> refusée');
const src = readFileSync(new URL('./migration-acces-nutrition.mjs', import.meta.url), 'utf8');
ok(!/@(belfit|gmail|outlook)\./i.test(src), 'aucune adresse réelle en dur dans le script');

// Les clés « nutrition » du client = celles des règles Firestore.
const regles = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const dansRegles = [...regles.match(/function nutriCles\(\) \{\s*return \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
const cli = readFileSync(new URL('../app-v2/src/store/acces-nutrition.js', import.meta.url), 'utf8');
const dansClient = [...cli.match(/CLES_NUTRITION = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
ok(JSON.stringify(dansRegles) === JSON.stringify(dansClient), 'clés nutrition identiques (règles Firestore = application)');
process.exit(code);
