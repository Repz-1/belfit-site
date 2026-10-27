// Inscrits (27/10) : liste LES DERNIERS COMPTES CREES, en LECTURE SEULE.
// Aucune ecriture, aucune suppression, aucun envoi d'e-mail.
//
//   node tools/diagnostic/inscrits.mjs <fichier-complet> [nombre]
//
// - stdout (= journal public du workflow) : dates de creation uniquement, aucun e-mail.
// - <fichier-complet> : e-mails complets, prenom, objectif ; le workflow
//   le chiffre avant de le publier (le depot est public).
// - INSCRITS_FACTICE=1 : donnees inventees, sans Firebase (test du
//   formatage, du masquage et du chiffrement).
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const PROJET = 'repz-baf60';
const fuseau = 'Europe/Brussels';
const fmt = new Intl.DateTimeFormat('fr-BE', {
  timeZone: fuseau, day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

/** Date lisible en heure de Bruxelles, ou « jamais ». */
export function dateBxl(valeur) {
  if (!valeur) return 'jamais';
  const t = new Date(valeur);
  if (isNaN(t.getTime())) return 'jamais';
  return fmt.format(t).replace(',', '') + ' (Bruxelles)';
}

/** « jean.dupont@hotmail.com » -> « j***@h***.com ». Jamais l'adresse entiere. */
export function masquerEmail(email) {
  if (!email || !String(email).includes('@')) return '(pas d\'e-mail)';
  const [local, domaine] = String(email).split('@');
  const pts = domaine.split('.');
  const ext = pts.length > 1 ? '.' + pts[pts.length - 1] : '';
  return `${local.slice(0, 1)}***@${domaine.slice(0, 1)}***${ext}`;
}

const oui = (b) => (b ? 'oui' : 'non');
const NOMS_FOURNISSEUR = { password: 'e-mail + mot de passe', 'google.com': 'Google', 'apple.com': 'Apple', 'facebook.com': 'Facebook' };
const fournisseurs = (u) => ((u.providerData || []).map((p) => NOMS_FOURNISSEUR[p.providerId] || p.providerId).join(', ')) || 'inconnu';

/** Texte d'une reponse du questionnaire (meme logique que functions/index.js). */
const texteRep = (rep, id) => { const r = rep && rep[id]; return r ? String(r.texte || r.valeur || '').slice(0, 120) : ''; };

/** Resume du dossier Firestore, SANS donnee de paiement ni de sante. */
export function resumeDossier(d) {
  if (!d) return { existe: false };
  const q = d.questionnaireCoach || {};
  const rep = q.reponses || {};
  const c = d.commandeCoach || null;
  const p = d.programme || null;
  return {
    existe: true,
    pseudo: d.pseudo || null,
    prenom: texteRep(rep, 'prenom'),
    objectif: texteRep(rep, 'objectif'),
    premium: !!d.premium,
    formule: d.formule || null,
    achat: c ? { type: c.type || null, payeLe: c.payeLe || null, source: c.source || null,
      virement: (c.virement && c.virement.statut) || null } : null,
    questionnaireEnvoyeLe: q.envoyeLe || null,
    plan: p ? { livreLe: p.livreLe || null, kcal: p.kcal || null } : null,
  };
}

/** Texte COMPLET (sortie chiffree) et texte MASQUE (journal public). */
export function formater(comptes, total, maintenant = new Date()) {
  const entete = `Inscrits BelFit - ${dateBxl(maintenant)} - ${total} compte(s) au total, ${comptes.length} derniers affiches (du plus recent au plus ancien).`;
  const complet = [entete, ''];
  const masque = [entete, '(journal public : dates de creation seulement, details dans la sortie chiffree)', ''];
  comptes.forEach(({ u, dossier }, i) => {
    const dos = dossier || { existe: false };
    const base = [
      `Cree le : ${dateBxl(u.metadata.creationTime)}`,
      `E-mail verifie : ${oui(u.emailVerified)}`,
      `Connexion : ${fournisseurs(u)}`,
      `Derniere connexion : ${dateBxl(u.metadata.lastSignInTime)}`,
    ];
    const detail = !dos.existe ? ['Dossier Firestore : non (aucun profil enregistre)'] : [
      'Dossier Firestore : oui',
      `Pseudo : ${dos.pseudo || '-'}`,
      `Objectif (questionnaire coach) : ${dos.objectif || '-'}`,
      `Premium : ${oui(dos.premium)}${dos.formule ? ' (' + dos.formule + ')' : ''}`,
      `Achat coaching : ${dos.achat ? `${dos.achat.type || '?'} le ${dateBxl(dos.achat.payeLe)} (via ${dos.achat.source || 'lemonsqueezy'})${dos.achat.virement ? ', virement : ' + dos.achat.virement : ''}` : 'aucun'}`,
      `Questionnaire envoye : ${dos.questionnaireEnvoyeLe ? dateBxl(dos.questionnaireEnvoyeLe) : 'non'}`,
      `Plan livre : ${dos.plan ? `oui, le ${dateBxl(dos.plan.livreLe)}${dos.plan.kcal ? ', ' + dos.plan.kcal + ' kcal' : ''}` : 'non (pas encore de plan)'}`,
    ];
    complet.push(`#${i + 1}  ${u.email || '(pas d\'e-mail)'}${dos.prenom ? '  -  ' + dos.prenom : ''}`, ...base.map((l) => '   ' + l), ...detail.map((l) => '   ' + l), '');
    masque.push(`#${i + 1}  cree le ${dateBxl(u.metadata.creationTime)}`);
  });
  complet.push('Langue : non enregistree sur le serveur (elle reste sur l\'appareil de l\'utilisateur).');
  return { complet: complet.join('\n'), masque: masque.join('\n') };
}

// ---------------- Donnees factices (test uniquement) ----------------
function factices() {
  const il = (h) => new Date(Date.now() - h * 36e5).toISOString();
  const mk = (uid, email, h, verifie, prov, derniere) => ({ uid, email, emailVerified: verifie,
    providerData: [{ providerId: prov }], metadata: { creationTime: il(h), lastSignInTime: derniere === null ? null : il(derniere) } });
  return [
    { u: mk('f1', 'prenom.nom.factice@exemple.test', 2, false, 'password', null), dossier: null },
    { u: mk('f2', 'test.faux@exemple.invalid', 30, true, 'google.com', 5), dossier: resumeDossier({
      pseudo: 'faux_pseudo', premium: true, formule: 'mensuel',
      questionnaireCoach: { envoyeLe: il(20), reponses: { prenom: { texte: 'Prénom-Factice' }, objectif: { texte: 'Prise de muscle' } } },
      commandeCoach: { type: 'plan', payeLe: il(26), source: 'mollie' }, programme: { livreLe: il(3), kcal: 3050 } }) },
    { u: mk('f3', 'x@y.test', 100, true, 'password', 50), dossier: resumeDossier({ pseudo: null }) },
  ];
}

// ---------------- Lecture reelle (LECTURE SEULE) ----------------
async function reel(nombre) {
  // firebase-admin est installe dans functions/ (npm ci --prefix functions).
  const require = createRequire(new URL('../../functions/package.json', import.meta.url));
  const admin = require('firebase-admin');
  admin.initializeApp({ projectId: PROJET }); // cle via GOOGLE_APPLICATION_CREDENTIALS
  const tous = [];
  let page;
  do { // listUsers : lecture seule ; l'ordre n'est pas garanti, on trie nous-memes
    const r = await admin.auth().listUsers(1000, page);
    tous.push(...r.users);
    page = r.pageToken;
  } while (page);
  tous.sort((a, b) => new Date(b.metadata.creationTime) - new Date(a.metadata.creationTime));
  const derniers = tous.slice(0, nombre);
  const db = admin.firestore();
  const refs = derniers.map((u) => db.collection('users').doc(u.uid));
  const docs = refs.length ? await db.getAll(...refs) : []; // lecture seule
  return { total: tous.length, comptes: derniers.map((u, i) => ({ u, dossier: docs[i].exists ? resumeDossier(docs[i].data()) : null })) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sortie = process.argv[2];
  const nombre = Math.min(50, Math.max(1, parseInt(process.argv[3], 10) || 10));
  if (!sortie) { console.error('Usage : inscrits.mjs <fichier-complet> [nombre]'); process.exit(2); }
  let lot;
  if (process.env.INSCRITS_FACTICE === '1') {
    const c = factices();
    lot = { total: c.length, comptes: c };
  } else {
    lot = await reel(nombre);
  }
  const { complet, masque } = formater(lot.comptes, lot.total);
  const avert = process.env.INSCRITS_FACTICE === '1' ? 'ATTENTION : DONNEES FACTICES (test de l\'outil), PAS DE VRAIS CLIENTS.\n' : '';
  writeFileSync(sortie, avert + complet + '\n', { mode: 0o600 });
  console.log(avert + masque);
}
