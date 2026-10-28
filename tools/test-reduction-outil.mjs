// Outil codes-reduction : arguments, simulation par defaut, secret jamais affiche. Aucun reseau reel.
import { lancer, lireArguments } from './codes-reduction.mjs';
let echecs = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) echecs++; };
const SECRET = 'secret-de-test-local';
const capte = () => { const o = { out: [], err: [], log: (...x) => o.out.push(x.join(' ')), error: (...x) => o.err.push(x.join(' ')) }; return o; };
let envoyes = [];
const faux = (statut, corps) => async (url, opt) => { envoyes.push({ url, opt, corps: JSON.parse(opt.body) }); return { status: statut, ok: statut < 400, json: async () => corps }; };
const tout = (o) => o.out.concat(o.err).join('\n');

let s = capte(); envoyes = [];
let c = await lancer(['creer', 'marc 10', '--pourcent', '10'], { COACH_CODE: SECRET }, s, faux(200, {}));
ok(c === 0 && envoyes.length === 0 && /SIMULATION/.test(tout(s)) && /72\.00/.test(tout(s)), 'sans --confirmer : simulation, aucune requête (72,00 € annoncé)');
s = capte(); envoyes = [];
c = await lancer(['creer', 'marc 10', '--pourcent', '10', '--note', 'Marc', '--confirmer'], { COACH_CODE: SECRET, BELFIT_FONCTIONS_URL: 'http://127.0.0.1:9999' }, s, faux(200, { ok: true, code: 'MARC10', pourcent: 10, montant: '72.00' }));
ok(c === 0 && envoyes.length === 1 && envoyes[0].url === 'http://127.0.0.1:9999/adminCodesReduction' && envoyes[0].corps.nomCode === 'MARC10' && envoyes[0].corps.pourcent === 10 && envoyes[0].corps.code === SECRET, 'avec --confirmer : requête vers le serveur local de test, code normalisé, secret dans le corps');
ok(!tout(s).includes(SECRET) && /MARC10/.test(tout(s)) && /72\.00/.test(tout(s)), 'le secret n\'est jamais affiché');
ok(!/COACH_CODE=|secret/i.test(JSON.stringify(envoyes[0].url)), 'le secret ne passe pas dans l\'adresse');
s = capte(); c = await lancer(['creer', 'X', '--pourcent', '10', '--confirmer'], { COACH_CODE: SECRET }, s, faux(200, {})); ok(c === 2, 'code trop court refusé');
for (const p of ['0', '95', '12.5', 'abc', undefined]) { s = capte(); c = await lancer(['creer', 'TEST1', ...(p ? ['--pourcent', p] : []), '--confirmer'], { COACH_CODE: SECRET }, s, faux(200, {})); ok(c === 2 && envoyes.length === 1, 'pourcentage ' + p + ' refusé avant tout envoi'); }
s = capte(); c = await lancer(['creer', 'TEST1', '--pourcent', '10', '--confirmer'], {}, s, faux(200, {})); ok(c === 2 && /COACH_CODE/.test(tout(s)), 'sans variable COACH_CODE : refus explicite');
s = capte(); c = await lancer(['creer', 'TEST1', '--pourcent', '10', '--confirmer'], { COACH_CODE: SECRET, BELFIT_FONCTIONS_URL: 'http://evil.example/' }, s, faux(200, {})); ok(c === 2 && envoyes.length === 1, 'adresse non https / non locale refusée : le secret ne part jamais ailleurs');
s = capte(); c = await lancer(['creer', 'TEST1', '--pourcent', '10', '--secret', 'x', '--confirmer'], { COACH_CODE: SECRET }, s, faux(200, {})); ok(c === 2, 'le secret en argument n\'existe pas : option inconnue');
s = capte(); c = await lancer(['creer', 'TEST1', '--pourcent', '10', '--confirmer'], { COACH_CODE: SECRET }, s, faux(409, { ok: false, motif: 'existe' })); ok(c === 1 && /existe déjà/.test(tout(s)), 'code existant : message clair');
s = capte(); c = await lancer(['lister'], { COACH_CODE: SECRET }, s, faux(403, { ok: false, motif: 'secret' })); ok(c === 1 && !tout(s).includes(SECRET), 'mauvais secret : refus, rien d\'affiché');
s = capte(); c = await lancer(['lister'], { COACH_CODE: SECRET }, s, faux(200, { ok: true, codes: [{ code: 'MARC10', pourcent: 10, actif: true, etat: 'libre', note: 'Marc', expire: null }] })); ok(c === 0 && /MARC10\s+-10 %\s+libre/.test(tout(s)), 'lister : une ligne par code');
s = capte(); envoyes = []; c = await lancer(['desactiver', 'MARC10'], { COACH_CODE: SECRET }, s, faux(200, {})); ok(c === 0 && envoyes.length === 0, 'désactiver sans --confirmer : simulation');
s = capte(); c = await lancer(['desactiver', 'marc10', '--confirmer'], { COACH_CODE: SECRET }, s, faux(200, { ok: true, code: 'MARC10', actif: false })); ok(c === 0 && /désactivé/.test(tout(s)), 'désactiver --confirmer');
ok(lireArguments(['creer', 'A', '--pourcent', '5']).pourcent === '5', 'lecture des arguments');
console.log(echecs ? '\nÉCHEC (' + echecs + ')' : '\nOK'); process.exit(echecs ? 1 : 0);
