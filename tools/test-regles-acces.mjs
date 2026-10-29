// Test des REGLES FIRESTORE du blocage alimentation, contre le VRAI emulateur
// Firestore (pas une simulation). Lancement (aucune connexion a un vrai projet) :
//   EMU_DIR=/chemin/vers/emu  PATH=<jre>/bin:$PATH \
//   $EMU_DIR/node_modules/.bin/firebase emulators:exec --only firestore \
//     --project demo-belfit "node tools/test-regles-acces.mjs"
// EMU_DIR contient node_modules avec @firebase/rules-unit-testing et firebase.
// Sans emulateur (java/firebase-tools absents), ce test s'arrete en disant
// qu'il n'a RIEN verifie : il ne passe jamais « pour de faux ».
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const EMU = process.env.EMU_DIR || '/workspace/emu';
if (!process.env.FIRESTORE_EMULATOR_HOST || !fs.existsSync(path.join(EMU, 'node_modules'))) {
  console.log('NON VERIFIE : emulateur Firestore indisponible (FIRESTORE_EMULATOR_HOST ou EMU_DIR manquant).');
  process.exit(2);
}
const req = createRequire(path.join(EMU, 'package.json'));
const { initializeTestEnvironment, assertFails, assertSucceeds } = req('@firebase/rules-unit-testing');
const firebase = req('firebase/compat/app'); req('firebase/compat/firestore');
const Ts = firebase.firestore.Timestamp;

const [hote, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
const env = await initializeTestEnvironment({
  projectId: 'demo-belfit',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8'), host: hote, port: Number(port) },
});

const JOUR = 86400000;
let ok = 0, ko = 0;
async function cas(nom, attendu, fn) {
  try {
    await (attendu === 'ok' ? assertSucceeds(fn()) : assertFails(fn()));
    ok++; console.log('  ok  ' + nom);
  } catch (e) { ko++; console.log('  ECHEC ' + nom + ' : ' + String(e.message).slice(0, 120)); }
}
async function preparer({ blocage, acces, v2Data }) {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    if (blocage !== undefined) await db.doc('config/acces').set({ blocage });
    const u = { pseudo: 'x', v2Data: v2Data || { repas: [{ id: 1 }], histoJours: { '2026-10-01': { kcal: 1 } }, eau: 1 } };
    if (acces !== undefined) u.accesNutritionJusqu = acces;
    await db.doc('users/u1').set(u);
    await db.doc('users/u2').set({ pseudo: 'y' });
  });
}
const moi = () => env.authenticatedContext('u1').firestore().doc('users/u1');
const maj = (champs) => moi().set({ v2Data: champs }, { merge: true });

console.log('A. Interrupteur absent : personne n\'est bloque');
await preparer({});
await cas('ecrire repas sans acces, sans interrupteur', 'ok', () => maj({ repas: [{ id: 2 }] }));

console.log('B. Interrupteur false : personne n\'est bloque');
await preparer({ blocage: false });
await cas('ecrire repas', 'ok', () => maj({ repas: [{ id: 2 }] }));

console.log('C. Interrupteur true, compte JAMAIS paye (champ absent)');
await preparer({ blocage: true });
await cas('ecrire repas : refuse', 'fail', () => maj({ repas: [{ id: 2 }] }));
await cas('ecrire histoJours : refuse', 'fail', () => maj({ histoJours: { '2026-10-02': { kcal: 5 } } }));
await cas('ecrire objectifs : refuse', 'fail', () => maj({ objectifs: { kcal: 2000 } }));
await cas('ecrire favoris : refuse', 'fail', () => maj({ favoris: ['Riz'] }));
await cas('ecrire plats : refuse', 'fail', () => maj({ plats: [] }));
await cas('ecrire courses : refuse', 'fail', () => maj({ courses: [] }));
await cas('ecrire customFoods : refuse', 'fail', () => maj({ customFoods: {} }));
await cas('seances + repas dans la meme ecriture : refuse en bloc', 'fail', () => maj({ seances: [1], repas: [{ id: 3 }] }));
await cas('seances seules : accepte', 'ok', () => maj({ seances: [{ id: 1 }] }));
await cas('poids seul : accepte', 'ok', () => maj({ weightLog: [{ iso: '2026-10-27', weight: 80 }] }));
await cas('eau seule : accepte', 'ok', () => maj({ eau: 500 }));
await cas('reecrire repas A L\'IDENTIQUE + seances : accepte (rien de change)', 'ok', () => maj({ repas: [{ id: 1 }], seances: [{ id: 2 }] }));
await cas('supprimer la cle repas : refuse', 'fail', () => moi().update({ 'v2Data.repas': firebase.firestore.FieldValue.delete() }));
await cas('s\'attribuer accesNutritionJusqu : refuse', 'fail', () => moi().set({ accesNutritionJusqu: Ts.fromMillis(Date.now() + 365 * JOUR) }, { merge: true }));
await cas('ecrire le compte d\'un autre : refuse', 'fail', () => env.authenticatedContext('u1').firestore().doc('users/u2').set({ v2Data: { seances: [] } }, { merge: true }));
await cas('modifier config/acces : refuse', 'fail', () => env.authenticatedContext('u1').firestore().doc('config/acces').set({ blocage: false }));
await cas('lire config/acces connecte : accepte', 'ok', () => env.authenticatedContext('u1').firestore().doc('config/acces').get());
await cas('lire config/acces anonyme : refuse', 'fail', () => env.unauthenticatedContext().firestore().doc('config/acces').get());

console.log('D. Interrupteur true, acces ACTIF');
await preparer({ blocage: true, acces: Ts.fromMillis(Date.now() + 10 * JOUR) });
await cas('ecrire repas : accepte', 'ok', () => maj({ repas: [{ id: 2 }] }));
await cas('ecrire histoJours : accepte', 'ok', () => maj({ histoJours: { '2026-10-02': { kcal: 5 } } }));

console.log('E. Interrupteur true, acces EXPIRE');
await preparer({ blocage: true, acces: Ts.fromMillis(Date.now() - JOUR) });
await cas('ecrire repas : refuse', 'fail', () => maj({ repas: [{ id: 2 }] }));
await cas('seances : accepte', 'ok', () => maj({ seances: [{ id: 9 }] }));

console.log('F. Interrupteur true, acces ILLIMITE (9999-12-31, compte proprietaire/coach)');
await preparer({ blocage: true, acces: Ts.fromMillis(Date.UTC(9999, 11, 31)) });
await cas('ecrire repas : accepte', 'ok', () => maj({ repas: [{ id: 2 }] }));

console.log('G. Champ mal forme (texte au lieu de Timestamp)');
await preparer({ blocage: true, acces: '2099-01-01' });
await cas('texte ISO dans le champ : ne vaut PAS un acces', 'fail', () => maj({ repas: [{ id: 2 }] }));

console.log('H. Creation du document par le client');
await preparer({ blocage: true });
await env.withSecurityRulesDisabled(async (c) => { await c.firestore().doc('users/u3').delete(); });
const neuf = () => env.authenticatedContext('u3').firestore().doc('users/u3');
await cas('creation avec repas : refuse', 'fail', () => neuf().set({ v2Data: { repas: [{ id: 1 }] } }, { merge: true }));
await cas('creation avec accesNutritionJusqu : refuse', 'fail', () => neuf().set({ accesNutritionJusqu: Ts.fromMillis(Date.now() + JOUR) }, { merge: true }));
await cas('creation avec seances : accepte', 'ok', () => neuf().set({ v2Data: { seances: [] } }, { merge: true }));

await env.cleanup();
console.log('\n' + ok + ' reussis, ' + ko + ' en echec');
process.exit(ko ? 1 : 0);
