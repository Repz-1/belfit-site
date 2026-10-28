// Frequence du message de bienvenue : UNE ouverture sur CINQ (Raci, 28/10). Sans navigateur.
// Verifie la regle pure (`decider`) ET que le petit script de app-v2/index.html (execute tel quel,
// dans un faux navigateur) prend EXACTEMENT les memes decisions : une seule decision par
// ouverture, prise avant le premier rendu. Lancer : node tools/test-accueil-frequence.mjs
import { readFileSync } from 'fs';
import vm from 'vm';
import { decider, UNE_SUR, CLE_COMPTEUR, CLE_INSTANT, DELAI_RECHARGEMENT_MS, absenceLongue } from '../app-v2/src/services/accueil-frequence.js';
let code = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) code = 1; };

const faux = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k), m }; };
const T0 = Date.UTC(2026, 9, 28, 8, 0, 0), H = 3600e3;
const jamais = () => { throw new Error('tirage inattendu'); };

// 1) 1 a 12 ouvertures consecutives (espacees de 2 h : pas de rechargement)
{
  const s = faux(); const r = [];
  for (let i = 0; i < 12; i++) r.push(decider(s, T0 + i * 2 * H, jamais));
  const attendu = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  ok(JSON.stringify(r.map(Number)) === JSON.stringify(attendu), 'ouvertures 1 a 12 : message aux 1re, 6e, 11e seulement (' + r.map(Number).join('') + ')');
  ok(r.filter(Boolean).length === 3, '12 ouvertures -> 3 messages (~1 sur 5, jamais a chaque fois)');
  ok(s.getItem(CLE_COMPTEUR) === '2', 'le compteur reste borne (0 a 4) : ' + s.getItem(CLE_COMPTEUR));
}
// 2) marqueur absent / illisible : premiere ouverture = message, puis le compteur repart proprement
for (const [nom, v] of [['absent', undefined], ['vide', ''], ['texte', 'abc'], ['negatif', '-3'], ['NaN', 'NaN'], ['Infinity', 'Infinity']]) {
  const s = faux(v === undefined ? {} : { [CLE_COMPTEUR]: v });
  const a = decider(s, T0, jamais), b = decider(s, T0 + 2 * H, jamais);
  ok(a === true && b === false && s.getItem(CLE_COMPTEUR) === '2', 'compteur ' + nom + ' : message puis pas de message, compteur repart a 0 (' + s.getItem(CLE_COMPTEUR) + ')');
}
ok(decider(faux({ [CLE_COMPTEUR]: '7' }), T0, jamais) === false && decider(faux({ [CLE_COMPTEUR]: '10' }), T0, jamais) === true, 'valeur hors 0-4 (7, 10) : ramenee a son reste modulo 5');
// 3) compter une seule fois : un rechargement < 60 s ne compte pas et ne montre rien
{
  const s = faux(); const a = decider(s, T0, jamais);
  const b = decider(s, T0 + 5000, jamais), c = decider(s, T0 + DELAI_RECHARGEMENT_MS - 1, jamais);
  ok(a === true && b === false && c === false && s.getItem(CLE_COMPTEUR) === '1', 'rechargement dans les 60 s : ni message ni nouveau comptage (compteur ' + s.getItem(CLE_COMPTEUR) + ')');
  const d = decider(s, T0 + DELAI_RECHARGEMENT_MS, jamais);
  ok(d === false && s.getItem(CLE_COMPTEUR) === '2', 'apres 60 s : nouvelle ouverture comptee (compteur 2, pas de message)');
  const f = faux({ [CLE_COMPTEUR]: '0', [CLE_INSTANT]: String(T0 + 10 * H) });
  ok(decider(f, T0, jamais) === true, 'horloge revenue en arriere (instant dans le futur) : pas de blocage');
}
// 4) stockage indisponible : jamais de crash, repli sur affichage RARE (tirage 1 sur 5)
{
  const casse = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('quota'); } };
  const lectOk = { getItem: () => null, setItem() { throw new Error('quota'); } };   // lecture ok, ecriture refusee (mode prive)
  for (const [nom, st] of [['lecture et ecriture refusees', casse], ['ecriture refusee', lectOk], ['aucun stockage (null)', null], ['undefined', undefined]]) {
    let r; try { r = [0.0, 0.19, 0.2, 0.5, 0.99].map((t) => decider(st, T0, () => t)); } catch (e) { r = 'CRASH ' + e.message; }
    ok(JSON.stringify(r) === '[true,true,false,false,false]', nom + ' : pas de crash, message seulement si tirage < 1/5 (' + JSON.stringify(r) + ')');
  }
  ok(decider(casse, T0, () => { throw new Error('x'); }) === false, 'tirage lui-meme en panne : pas de message, pas de crash');
  let n = 0; for (let i = 0; i < 10000; i++) if (decider(casse, T0)) n++;
  ok(n > 1500 && n < 2500, 'sans stockage, avec le vrai hasard : environ 1 ouverture sur 5 (' + n + '/10000)');
}
ok(UNE_SUR === 5, 'frequence : 1 sur ' + UNE_SUR);
// 5) retours au premier plan : seuil de 30 min inchange, meme compteur
ok(absenceLongue(0, 30 * 60e3 + 1) && !absenceLongue(0, 30 * 60e3), 'retour : seulement apres plus de 30 min');
{
  const s = faux(); const dec = []; let t = T0;
  dec.push(decider(s, t, jamais));                      // ouverture a froid
  for (let i = 0; i < 6; i++) { t += 40 * 60e3; dec.push(decider(s, t, jamais)); }   // 6 retours apres 40 min
  ok(JSON.stringify(dec.map(Number)) === '[1,0,0,0,0,1,0]', 'ouverture + 6 retours > 30 min : meme cadence 1 sur 5 (' + dec.map(Number).join('') + ')');
}

// 6) LE SCRIPT DE index.html : execute dans un faux navigateur, doit decider comme `decider`
const html = readFileSync(new URL('../app-v2/index.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((x) => x.includes('__accueilOuverture'));
ok(!!script, 'index.html contient le script de decision (synchrone, non module)');
ok(!/<script[^>]*\b(async|defer|type="module")/.test(html.slice(0, html.indexOf('__accueilOuverture'))), 'le script de decision n\'est ni async, ni defer, ni module (il s\'execute avant le premier rendu)');
ok(html.indexOf('__accueilOuverture') < html.indexOf('src="/src/main.jsx"') && html.indexOf('__accueilOuverture') < html.indexOf('<div id="splash">'), 'il est place avant le splash et avant main.jsx');
function lancerScript(init, now, { tirage, stockageCasse } = {}) {
  const st = stockageCasse ? { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('x'); } } : faux(init);
  const meta = { v: '#F4F3F0', setAttribute(k, v) { this.v = v; } };
  const w = { localStorage: st, __accueilTirage: tirage };
  const doc = { documentElement: { className: '' }, querySelector: () => meta };
  const ctx = vm.createContext({ window: w, document: doc, Math, Date: { now: () => now }, parseInt, Number, String, localStorage: st });
  vm.runInContext(script, ctx);
  return { ouverture: w.__accueilOuverture, attendu: w.__accueilAttendu, classe: doc.documentElement.className, theme: meta.v, st };
}
{
  // memes sequences que `decider`, via le script ; connu + pas de sortie : classe acc-attendu seulement quand message
  const s = faux({ belfit_accueil_connu: '1' }); const sortie = []; const cl = [];
  let compteurs = [];
  for (let i = 0; i < 12; i++) {
    const meta = { v: '#F4F3F0', setAttribute(k, v) { this.v = v; } };
    const w = {}; const doc = { documentElement: { className: '' }, querySelector: () => meta };
    vm.runInContext(script, vm.createContext({ window: w, document: doc, Math, Date: { now: () => T0 + i * 2 * H }, parseInt, Number, String, localStorage: s }));
    sortie.push(w.__accueilOuverture); cl.push(/acc-attendu/.test(doc.documentElement.className) ? 1 : 0); compteurs.push(s.getItem(CLE_COMPTEUR));
    if (w.__accueilOuverture === 0) ok(!w.__accueilAttendu && meta.v === '#F4F3F0', 'ouverture ' + (i + 1) + ' sans message : pas de splash sans logo, barre d\'etat inchangee');
  }
  ok(JSON.stringify(sortie) === JSON.stringify([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]), 'script index.html, 12 ouvertures : decisions identiques a `decider` (' + sortie.join('') + ')');
  ok(JSON.stringify(cl) === JSON.stringify(sortie), 'classe « acc-attendu » (splash sans logo) posee exactement quand le message suit (' + cl.join('') + ')');
  ok(compteurs.join('') === '123401234012', 'compteur avance d\'un cran par ouverture, une seule fois (' + compteurs.join('') + ')');
}
{
  const a = lancerScript({}, T0, { tirage: jamais });
  ok(a.ouverture === 1 && !a.attendu && a.classe === '' , '1re ouverture (marqueur « connu » absent) : message, mais splash habituel avec logo (comportement d\'avant)');
  const b = lancerScript({ belfit_accueil_connu: '1', belfit_sortie: '1' }, T0, { tirage: jamais });
  ok(b.ouverture === 1 && !b.attendu, 'deconnecte (belfit_sortie) : pas de splash sans logo');
  const c = lancerScript({ belfit_accueil_connu: '1', belfit_accueil_n: '3' }, T0, { tirage: jamais });
  ok(c.ouverture === 0 && !c.attendu && c.classe === '' && c.theme === '#F4F3F0' && c.st.getItem(CLE_COMPTEUR) === '4', 'compteur 3 : pas de message, le splash garde son logo, compteur -> 4');
  const d = lancerScript({ belfit_accueil_connu: '1', belfit_accueil_n: '0' }, T0, { tirage: jamais });
  ok(d.ouverture === 1 && d.attendu === 1 && /acc-attendu/.test(d.classe) && d.theme === '#f7f4ef', 'compteur 0 + connu : message, splash sans logo (acc-attendu) + creme');
  const e = lancerScript({ belfit_accueil_connu: '1', belfit_accueil_n: '0', belfit_accueil_t: String(T0 - 10000) }, T0, { tirage: jamais });
  ok(e.ouverture === 0 && !e.attendu && e.st.getItem(CLE_COMPTEUR) === '0', 'rechargement 10 s apres : pas de message, pas de comptage');
  let f; try { f = [0.05, 0.9].map((t) => lancerScript({}, T0, { stockageCasse: true, tirage: () => t }).ouverture); } catch (x) { f = 'CRASH ' + x.message; }
  ok(JSON.stringify(f) === '[1,0]', 'stockage indisponible : pas de crash, repli sur le tirage 1/5 (' + JSON.stringify(f) + ')');
}
// 7) main.jsx ne decide pas a l'ouverture : il lit seulement la decision (pas de double comptage)
const main = readFileSync(new URL('../app-v2/src/main.jsx', import.meta.url), 'utf8');
ok(/window\.__accueilOuverture !== 0/.test(main), 'main.jsx lit window.__accueilOuverture');
ok((main.match(/decider\(/g) || []).length === 1 && /absenceLongue\(masqueA, Date\.now\(\)\) && retourAvecMessage\(\)/.test(main), 'main.jsx n\'appelle `decider` que pour les retours apres longue absence (1 seul appel)');
console.log(code ? '\nECHEC' : '\nOK');
process.exit(code);
