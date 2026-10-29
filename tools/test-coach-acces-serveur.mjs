// Le coach IA texte (functions/coach.js) refuse un compte sans acces nutrition quand le blocage est allume.
// Tests purs : firebase-admin est SIMULE, aucun reseau, aucun vrai compte. DONNEES DE TEST uniquement.
import { createRequire } from 'module';
const exiger = createRequire(import.meta.url);
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };
const J = 86400000;

const etat = { blocage: false, user: null, appelsGemini: 0 };
const depuisFonctions = createRequire(new URL('../functions/coach.js', import.meta.url));
const faux = {};
faux.auth = () => ({ verifyIdToken: async () => ({ uid: 'u1' }) });
faux.firestore = () => ({
  collection: (nom) => ({ doc: () => ({ get: async () => {
    if (nom === 'config') return { exists: etat.blocage !== null, data: () => ({ blocage: etat.blocage }) };
    return { exists: !!etat.user, data: () => etat.user };
  } }) }),
});
const chemin = depuisFonctions.resolve('firebase-admin');
depuisFonctions(chemin); // charge le vrai module une fois, puis on le remplace dans le cache
depuisFonctions.cache[chemin].exports = faux;
globalThis.fetch = async () => { etat.appelsGemini++; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"texte":"ok","aliments":[]}' }] } }] }) }; };
process.env.GEMINI_API_KEY = 'faux';

const { coachAgent } = exiger('../functions/coach.js');
const A = exiger('../functions/acces-nutrition.js');

async function appeler() {
  A.oublierCacheBlocage(); etat.appelsGemini = 0;
  const h = { authorization: 'Bearer x', origin: 'https://belfit.be' };
  const req = { method: 'POST', headers: h, body: { message: '200 g de riz', contexte: {} }, get: (k) => h[k.toLowerCase()] || '', rawBody: Buffer.from('{}') };
  let statut = 200, corps = null;
  const res = { set() { return res; }, header() { return res; }, setHeader() { return res; }, getHeader() { return undefined; }, status(s) { statut = s; return res; }, json(c) { corps = c; return res; }, send(c) { corps = c; return res; }, end() { return res; }, on() { return res; }, once() { return res; }, emit() {}, removeListener() {} };
  await coachAgent(req, res);
  return { statut, corps, gemini: etat.appelsGemini };
}

etat.blocage = true; etat.user = null;
let r = await appeler();
ok(r.statut === 403 && r.corps && r.corps.error === 'acces_nutrition' && r.gemini === 0, 'blocage allumé, jamais payé : 403 acces_nutrition, aucun appel à l’IA');
etat.user = { accesNutritionJusqu: new Date(Date.now() - J) };
r = await appeler();
ok(r.statut === 403 && r.corps.error === 'acces_nutrition', 'blocage allumé, accès expiré : 403');
etat.user = { accesNutritionJusqu: new Date(Date.now() + 10 * J) };
r = await appeler();
ok(r.statut !== 403 && r.gemini === 1, 'blocage allumé, accès actif : le coach répond');
etat.user = { accesNutritionJusqu: new Date(Date.UTC(9999, 11, 31)) };
r = await appeler();
ok(r.statut !== 403 && r.gemini === 1, 'blocage allumé, accès sans fin (propriétaire/coach) : le coach répond');
etat.blocage = false; etat.user = null;
r = await appeler();
ok(r.statut !== 403 && r.gemini === 1, 'blocage éteint : personne n’est bloqué (état de livraison)');
etat.blocage = null; etat.user = null;
r = await appeler();
ok(r.statut !== 403 && r.gemini === 1, 'document config/acces absent : personne n’est bloqué');
process.exit(code);
