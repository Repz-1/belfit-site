// DIAGNOSTIC LECTURE SEULE : dates d'activite d'UN compte (adresse lue dans
// la charge utile de l'evenement GitHub, jamais affichee). Journal = dates seulement.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const fmt = (d) => (d ? new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', dateStyle: 'full', timeStyle: 'short' }).format(new Date(d)) : 'inconnue');
const ev = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const compte = String(ev.inputs?.compte || '').trim().toLowerCase();
if (!compte) { console.log('Aucun compte fourni.'); process.exit(1); }

const exiger = createRequire(new URL('../../functions/package.json', import.meta.url));
const admin = exiger('firebase-admin');
admin.initializeApp({ projectId: 'repz-baf60' });
let u;
try { u = await admin.auth().getUserByEmail(compte); } catch { console.log('Compte introuvable.'); process.exit(0); }
const m = u.metadata;
console.log('Creation du compte      :', fmt(m.creationTime));
console.log('Derniere connexion      :', fmt(m.lastSignInTime));
console.log('Derniere activite (jeton):', fmt(m.lastRefreshTime));
console.log('Fournisseurs            :', u.providerData.map((p) => p.providerId).join(', ') || 'aucun');

const db = admin.firestore();
const snap = await db.collection('users').where(admin.firestore.FieldPath.documentId(), '==', u.uid).get();
if (snap.empty) { console.log('Fiche Firestore : absente'); process.exit(0); }
const fiche = snap.docs[0];
console.log('Fiche users, derniere ecriture :', fmt(fiche.updateTime.toDate()));
const data = fiche.data();
const cles = Object.keys(data).sort();
console.log('Champs de la fiche (noms) :', cles.join(', '));
for (const [k, v] of Object.entries(data)) {
  if (v && typeof v.toDate === 'function') console.log('  date champ', k, ':', fmt(v.toDate()));
  else if (/(date|jour|updated|maj|debut|start|at)$/i.test(k) && (typeof v === 'number' || typeof v === 'string') && !String(v).includes('@')) console.log('  champ', k, ':', String(v).slice(0, 40));
}
for (const col of await fiche.ref.listCollections()) {
  const ds = await col.get();
  let max = null;
  ds.docs.forEach((d) => { const t = d.updateTime.toDate(); if (!max || t > max) max = t; });
  console.log('Sous-collection', col.id, ':', ds.size, 'documents, derniere ecriture', fmt(max));
}
