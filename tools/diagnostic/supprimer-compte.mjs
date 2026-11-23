// Supprimer UN compte BelFit (23/11, Raci). Workflow manuel supprimer-compte.yml.
// Cible : une seule adresse EXACTE, saisie deux fois (email + email_confirmation).
// Supprime : utilisateur Firebase Auth, users/{uid} (+ sous-collections),
// quotasIA/{uid}, usernames/{pseudo} si ce pseudo pointe vers ce uid.
// Sans confirme=OUI : SIMULATION (lecture seule). Journal public : ni adresse ni uid.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const PROJET = 'repz-baf60';
// Comptes jamais supprimables par cet outil (proprietaire, coach).
const PROTEGES = ['contact@belfit.be', 'coach@belfit.be', 'racicars@hotmail.com', 'sh.raci@hotmail.com',
  'sh.ra.150714@hotmail.com', 'rsh.fit.nutrition@hotmail.com'];

const ev = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
const i = ev.inputs || {};
const email = String(i.email || '').trim().toLowerCase();
const conf = String(i.email_confirmation || '').trim().toLowerCase();
const ecrire = String(i.confirme || 'NON').trim() === 'OUI';
const stop = (m) => { console.log(m); process.exit(1); };

if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)) stop('Une seule adresse e-mail valide attendue : arret.');
if (email !== conf) stop('email et email_confirmation differents : arret.');
if (PROTEGES.includes(email)) stop('Compte protege (proprietaire/coach) : arret.');
console.log(ecrire ? 'MODE SUPPRESSION (confirme=OUI)' : 'SIMULATION : rien ne sera supprime');

const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROJET });
const db = admin.firestore();

let u;
try { u = await admin.auth().getUserByEmail(email); } catch (e) { stop('Compte introuvable dans Firebase Auth : rien a faire.'); }
if (String(u.email || '').toLowerCase() !== email) stop('Adresse du compte trouve differente de l\'adresse demandee : arret.');
console.log('Compte Auth trouve : 1 (adresse identique a la demande)');
console.log('Cree le :', u.metadata.creationTime, '; fournisseurs :', u.providerData.map((p) => p.providerId).join(', ') || 'aucun');

const refU = db.collection('users').doc(u.uid);
const sU = await refU.get();
const d = sU.exists ? sU.data() : null;
const sous = sU.exists ? await refU.listCollections() : [];
let nbSous = 0;
for (const c of sous) { const n = (await c.get()).size; nbSous += n; console.log('Sous-collection', c.id, ':', n, 'documents'); }
console.log('Fiche users :', d ? `oui (champs : ${Object.keys(d).sort().join(', ')})` : 'non');
if (d) {
  const acces = d.accesNutritionJusqu && d.accesNutritionJusqu.toMillis && d.accesNutritionJusqu.toMillis() > Date.now();
  console.log('Programme :', d.programme ? 'oui' : 'non', '; commande/paiement :', d.commandeCoach ? 'oui' : 'non', '; acces nutrition actif :', acces ? 'oui' : 'non', '; premium :', d.premium ? 'oui' : 'non');
}
const refQ = db.collection('quotasIA').doc(u.uid);
const sQ = await refQ.get();
console.log('quotasIA :', sQ.exists ? 'oui' : 'non');
let refP = null;
if (d && d.pseudo) {
  const p = db.collection('usernames').doc(String(d.pseudo).toLowerCase());
  const sP = await p.get();
  if (sP.exists && sP.data().uid === u.uid) refP = p;
}
console.log('Pseudo reserve (usernames) :', refP ? 'oui' : 'non');

if (!ecrire) { console.log('Simulation terminee : 1 compte serait supprime.'); process.exit(0); }

if (sU.exists) await db.recursiveDelete(refU);
if (sQ.exists) await refQ.delete();
if (refP) await refP.delete();
await admin.auth().deleteUser(u.uid);
let reste = true;
try { await admin.auth().getUser(u.uid); } catch (e) { reste = false; }
const resteF = (await refU.get()).exists || (await refQ.get()).exists;
console.log(`Supprime : Auth oui ; users ${sU.exists ? 'oui' : '(absent)'} (+${nbSous} docs de sous-collections) ; quotasIA ${sQ.exists ? 'oui' : '(absent)'} ; pseudo ${refP ? 'oui' : '(absent)'}`);
console.log(`Controle : Auth encore present : ${reste ? 'OUI (ECHEC)' : 'non'} ; Firestore encore present : ${resteF ? 'OUI (ECHEC)' : 'non'}`);
if (reste || resteF) process.exit(1);
