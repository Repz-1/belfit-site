// Lire le plan d'un compte (27/10) : LECTURE SEULE de users/{uid}.programme.
// Aucune ecriture, aucune suppression, aucun envoi d'e-mail.
//
//   node tools/diagnostic/lire-plan.mjs <fichier-complet>
//
// L'e-mail du compte est lu dans la charge utile de l'evenement GitHub
// (GITHUB_EVENT_PATH -> inputs.email) ou, en test, dans LIRE_PLAN_EMAIL.
// Il n'est jamais passe en argument ni en variable de step (le journal
// d'un depot PUBLIC afficherait ces valeurs).
//
// - stdout (= journal public) : « lecture effectuee » + « programme present : oui/non ».
// - <fichier-complet> : le detail (uid, e-mail, versions...) ; le workflow le
//   chiffre avant de le publier.
// - LIRE_PLAN_FACTICE=1 : donnees inventees, sans Firebase (test).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const PROJET = 'repz-baf60';

const nb = (a) => (Array.isArray(a) ? a.length : 0);
const cles = (o) => (o && typeof o === 'object' ? Object.keys(o).sort() : []);

/** Jour AAAA-MM-JJ a Bruxelles. */
export function jourBxl(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Version active un jour donne : la derniere datee dont debut <= jour. */
export function versionActive(versions, jour) {
  const datees = (versions || []).filter((v) => v && v.debut).sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0));
  let active = null;
  datees.forEach((v) => { if (v.debut <= jour) active = v; });
  return active;
}

/** Resume STRUCTUREL du dossier (pas de contenu de repas, rien de sante/paiement). */
export function resume(uid, email, d, jour = jourBxl()) {
  const doc = d || null;
  const p = doc && doc.programme ? doc.programme : null;
  const c = doc && doc.commandeCoach ? doc.commandeCoach : null;
  const versions = p && Array.isArray(p.versions) ? p.versions : null;
  const active = versions ? versionActive(versions, jour) : null;
  return {
    uid, email, jour,
    docExiste: !!doc,
    programmePresent: !!p,
    livreLe: p ? p.livreLe || null : null,
    parCoach: p ? (p.parCoach === undefined ? null : p.parCoach) : null,
    tete: p ? { kcal: p.kcal ?? null, prot: p.prot ?? null, carbs: p.carbs ?? null, lip: p.lip ?? null, repas: nb(p.repas) } : null,
    versions: versions ? versions.map((v) => ({ libelle: v.libelle || '', debut: v.debut || null, kcal: v.kcal ?? null, repas: nb(v.repas) })) : null,
    versionActiveAujourdhui: active ? { libelle: active.libelle || '', debut: active.debut, repas: nb(active.repas) } : null,
    precedentPresent: !!(p && p.precedent),
    precedent: p && p.precedent ? { cles: cles(p.precedent), repas: nb(p.precedent.repas) } : null,
    clesProgramme: cles(p),
    clesDocument: cles(doc),
    commandeCoach: c ? { type: c.type || null, payeLe: c.payeLe || null } : null,
  };
}

export function formater(r) {
  const L = [];
  L.push(`Lecture du plan - compte ${r.email}  (uid ${r.uid})`);
  L.push(`Jour de reference (Bruxelles) : ${r.jour}`);
  L.push(`Document users/{uid} : ${r.docExiste ? 'existe' : 'ABSENT'}`);
  L.push(`Champ programme : ${r.programmePresent ? 'PRESENT' : 'ABSENT'}`);
  if (r.programmePresent) {
    L.push(`livreLe : ${r.livreLe}`);
    L.push(`parCoach : ${r.parCoach}`);
    L.push(`Tete : kcal ${r.tete.kcal}, prot ${r.tete.prot}, carbs ${r.tete.carbs}, lip ${r.tete.lip}, ${r.tete.repas} repas`);
    L.push(`versions : ${r.versions ? r.versions.length : 'absent'}`);
    (r.versions || []).forEach((v, i) => L.push(`  v${i + 1} : « ${v.libelle} » debut ${v.debut || '(sans date)'} - ${v.kcal} kcal - ${v.repas} repas`));
    L.push(`Version active aujourd'hui (${r.jour}) : ${r.versionActiveAujourdhui ? `« ${r.versionActiveAujourdhui.libelle} » debut ${r.versionActiveAujourdhui.debut}, ${r.versionActiveAujourdhui.repas} repas` : 'AUCUNE (aucune date <= aujourd\'hui)'}`);
    L.push(`precedent : ${r.precedentPresent ? `present (cles : ${r.precedent.cles.join(', ')} ; ${r.precedent.repas} repas)` : 'absent'}`);
    L.push(`Cles de programme : ${r.clesProgramme.join(', ')}`);
  }
  L.push(`Cles du document : ${r.clesDocument.join(', ') || '(aucune)'}`);
  L.push(`commandeCoach : ${r.commandeCoach ? `type ${r.commandeCoach.type}, payeLe ${r.commandeCoach.payeLe}` : 'absent'}`);
  return L.join('\n');
}

/** Journal PUBLIC : strict minimum. */
export function journalPublic(r) {
  return `lecture effectuee\nprogramme present : ${r.programmePresent ? 'oui' : 'non'}`;
}

function emailDemande() {
  if (process.env.LIRE_PLAN_EMAIL) return process.env.LIRE_PLAN_EMAIL.trim();
  const chemin = process.env.GITHUB_EVENT_PATH;
  if (!chemin) return '';
  const ev = JSON.parse(readFileSync(chemin, 'utf8'));
  return String((ev.inputs && ev.inputs.email) || '').trim();
}

async function reel(email) {
  const require = createRequire(new URL('../../functions/package.json', import.meta.url));
  const admin = require('firebase-admin');
  admin.initializeApp({ projectId: PROJET }); // cle via GOOGLE_APPLICATION_CREDENTIALS
  const u = await admin.auth().getUserByEmail(email); // lecture seule
  const snap = await admin.firestore().collection('users').doc(u.uid).get(); // lecture seule
  return resume(u.uid, u.email || email, snap.exists ? snap.data() : null);
}

function factice(email) {
  const v = (d, k) => ({ debut: d, libelle: 'Semaine factice', kcal: k, repas: [{}, {}, {}, {}, {}, {}] });
  return resume('uid-factice', email, {
    programme: { kcal: 3300, prot: 248, carbs: 400, lip: 90, repas: [{}, {}, {}, {}, {}, {}], livreLe: '2026-10-27T15:00:00Z', parCoach: true,
      versions: [v('2026-10-27', 3300), v('2026-11-04', 3400)], precedent: { repas: [{}] } },
    commandeCoach: { type: 'plan', payeLe: '2026-10-01' }, pseudo: 'x',
  }, '2026-10-27');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sortie = process.argv[2];
  if (!sortie) { console.error('Usage : lire-plan.mjs <fichier-complet>'); process.exit(2); }
  const email = emailDemande();
  if (!email || !email.includes('@')) { console.error('E-mail manquant ou invalide.'); process.exit(2); }
  const r = process.env.LIRE_PLAN_FACTICE === '1' ? factice(email) : await reel(email);
  const avert = process.env.LIRE_PLAN_FACTICE === '1' ? 'ATTENTION : DONNEES FACTICES (test de l\'outil).\n' : '';
  writeFileSync(sortie, avert + formater(r) + '\n', { mode: 0o600 });
  console.log(journalPublic(r));
}
