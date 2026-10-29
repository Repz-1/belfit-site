// MIGRATION de l'acces nutrition : donne le champ `accesNutritionJusqu` aux comptes
// qui ont DEJA un acces (paiement coaching, acces offert, code, proprietaire, coach),
// pour que personne ne perde son alimentation quand le blocage sera allume.
//
// PAR DEFAUT : --dry-run. Le script LISTE ce qu'il ecrirait et n'ecrit RIEN.
// Il ne s'execute jamais seul : l'ecriture reelle demande --execute ET --confirme=OUI,
// apres l'accord explicite de Raci.
//
// Comptes illimites (proprietaire, coach) : JAMAIS de liste dans le depot (il est public).
// Voie recommandee : l'action « offrir un acces sans fin » de l'espace coach (aucun deploiement).
// Voie de secours, au moment de l'execution seulement :
//   --illimites=adresse1,adresse2      ou      BELFIT_COMPTES_ILLIMITES=adresse1,adresse2
//
// Client de coaching a duree fixe (ex. 8 semaines) : l'adresse et la date de fin sont donnees
// au moment de l'execution, jamais ecrites dans le depot.
//   --compte=adresse --jusqu=2026-12-22     (date seule = FIN de ce jour, heure de Bruxelles, incluse)
//   --seulement                             (ne traiter QUE ce(s) compte(s) --compte)
//
// Sources d'acces existantes (toutes lues, rien n'est modifie hors du champ cible) :
//   - quotasIA/{uid}.illimiteJusqu  (IA illimitee 44 jours apres un achat coaching) -> meme date
//   - users/{uid}.accesPro.jusqu     (acces offert ou code ; vide = sans fin)        -> meme date
// Aucun ancien abonnement n'est migre (il n'y en a pas) : `premium` n'est pas lu.
// Jamais de raccourcissement : si le compte a deja une fin plus tardive, on n'y touche pas.
//
// Identifiants Firebase : fournis par l'environnement (GOOGLE_APPLICATION_CREDENTIALS).
// Ce script ne lit, n'affiche ni ne stocke aucune cle.
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const FIN_ILLIMITEE_MS = Date.UTC(9999, 11, 31);

function ms(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
}

// « 2026-12-22 » -> fin de ce jour a Bruxelles (= 00:00 le lendemain), l'heure d'ete est geree.
// Une date avec heure (ISO complet) est prise telle quelle.
export function finDeJourBruxelles(texte) {
  const t = String(texte || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) { const d = Date.parse(t); return Number.isNaN(d) ? null : d; }
  const nominal = Date.UTC(+m[1], +m[2] - 1, +m[3] + 1, 0, 0, 0);
  const decalage = (instant) => {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(instant));
    const g = (k) => +f.find(x => x.type === k).value;
    return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - instant;
  };
  let instant = nominal - decalage(nominal);
  instant = nominal - decalage(instant);
  return instant;
}

const masque = (e) => { const [a, b] = String(e || '').split('@'); return b ? a.slice(0, 2) + '***@' + b : '(sans e-mail)'; };

/**
 * Pur (testable sans reseau). comptes : [{uid, email, user, quota}]
 * @return {{ecrire: object[], ignorer: object[], aDecider: object[]}}
 */
export function planifier(comptes, { maintenantMs = Date.now(), illimites = [], clients = [], seulement = false } = {}) {
  const ill = new Set(illimites.map(e => String(e).trim().toLowerCase()).filter(Boolean));
  const cli = new Map(clients.map(x => [String(x.email).trim().toLowerCase(), x.finMs]));
  const sortie = { ecrire: [], ignorer: [] };
  for (const c of comptes) {
    const mail = String(c.email || '').toLowerCase();
    if (seulement && !cli.has(mail) && !ill.has(mail)) continue;
    const u = c.user || {}; const q = c.quota || {};
    const actuelle = ms(u.accesNutritionJusqu);
    const candidats = [];
    if (mail && ill.has(mail)) candidats.push({ fin: FIN_ILLIMITEE_MS, raison: 'compte illimité (argument)' });
    const qi = ms(q.illimiteJusqu);
    if (qi !== null) candidats.push({ fin: qi, raison: 'IA illimitée (achat coaching)' });
    if (u.accesPro && typeof u.accesPro === 'object') {
      const aj = ms(u.accesPro.jusqu);
      candidats.push({ fin: aj === null ? FIN_ILLIMITEE_MS : aj, raison: 'accès offert ou code' });
    }
    if (mail && cli.has(mail) && cli.get(mail) !== null) candidats.push({ fin: cli.get(mail), raison: 'client de coaching à durée fixe (argument)' });
    if (!candidats.length) {
      // Un accès déjà écrit (ex. sans fin) et encore valable compte comme « déjà à jour ».
      if (actuelle !== null && actuelle > maintenantMs) { sortie.ignorer.push({ uid: c.uid, raison: 'déjà à jour' }); continue; }
      sortie.ignorer.push({ uid: c.uid, raison: 'aucun accès existant' }); continue;
    }
    const meilleur = candidats.reduce((a, b) => (b.fin > a.fin ? b : a));
    // Un accès déjà expiré ne sert à rien d'être écrit (le compte reste fermé).
    if (meilleur.fin <= maintenantMs) { sortie.ignorer.push({ uid: c.uid, raison: 'accès déjà terminé (' + meilleur.raison + ')' }); continue; }
    if (actuelle !== null && actuelle >= meilleur.fin) { sortie.ignorer.push({ uid: c.uid, raison: 'déjà à jour' }); continue; }
    sortie.ecrire.push({ uid: c.uid, email: masque(c.email), fin: meilleur.fin, raison: meilleur.raison });
  }
  return sortie;
}

function arg(nom) { const a = process.argv.find(x => x.startsWith('--' + nom + '=')); return a ? a.slice(nom.length + 3) : null; }
const a = (nom) => process.argv.includes('--' + nom);
const jour = (m) => (m >= FIN_ILLIMITEE_MS ? 'sans fin' : new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', dateStyle: 'short', timeStyle: 'short' }).format(new Date(m)) + ' (heure de Bruxelles)');

async function principal() {
  const execute = a('execute') && arg('confirme') === 'OUI';
  if (a('execute') && !execute) { console.error('--execute demande aussi --confirme=OUI (accord de Raci).'); process.exit(2); }
  const illimites = (arg('illimites') || process.env.BELFIT_COMPTES_ILLIMITES || '').split(',').filter(Boolean);
  const clients = [];
  if (arg('compte')) {
    const finMs = finDeJourBruxelles(arg('jusqu'));
    if (finMs === null) { console.error('--compte demande aussi --jusqu=AAAA-MM-JJ (fin de ce jour incluse, heure de Bruxelles).'); process.exit(2); }
    clients.push({ email: arg('compte'), finMs });
  }
  const seulement = a('seulement');
  if (seulement && !clients.length && !illimites.length) { console.error('--seulement demande --compte=... et --jusqu=...'); process.exit(2); }
  const exiger = createRequire(new URL('../functions/package.json', import.meta.url));
  const admin = exiger('firebase-admin');
  admin.initializeApp({ projectId: 'repz-baf60' });
  const db = admin.firestore();
  const [us, qs] = await Promise.all([db.collection('users').get(), db.collection('quotasIA').get()]);
  const quotas = new Map(qs.docs.map(d => [d.id, d.data()]));
  const emails = new Map();
  // E-mails : uniquement pour reconnaître les comptes illimités (lecture seule, par lots de 100).
  const ids = us.docs.map(d => d.id);
  for (let i = 0; i < ids.length; i += 100) {
    const r = await admin.auth().getUsers(ids.slice(i, i + 100).map(uid => ({ uid })));
    r.users.forEach(x => emails.set(x.uid, x.email || ''));
  }
  const comptes = us.docs.map(d => ({ uid: d.id, email: emails.get(d.id) || '', user: d.data(), quota: quotas.get(d.id) || null }));
  const plan = planifier(comptes, { illimites, clients, seulement });
  if (clients.length && !comptes.some(c => String(c.email || '').toLowerCase() === String(clients[0].email).toLowerCase())) console.log(`ATTENTION : aucun compte trouvé pour l'adresse donnée dans --compte.`);
  console.log(`\n${execute ? 'ECRITURE RÉELLE' : 'SIMULATION (dry-run) : rien n\'est écrit'}`);
  console.log(`Comptes lus : ${comptes.length} · à écrire : ${plan.ecrire.length} · ignorés : ${plan.ignorer.length}\n`);
  plan.ecrire.forEach(x => console.log(`ÉCRIRE   ${x.uid}  ${x.email}  -> ${jour(x.fin)}  (${x.raison})`));
  if (execute) {
    for (const x of plan.ecrire) {
      await db.collection('users').doc(x.uid).set({ accesNutritionJusqu: admin.firestore.Timestamp.fromMillis(x.fin) }, { merge: true });
    }
    console.log('\nÉcriture terminée.');
  } else {
    console.log('\nRien n\'a été écrit. Pour écrire : relancer avec --execute --confirme=OUI après accord de Raci.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  principal().catch(e => { console.error('Échec :', e && e.message); process.exit(1); });
}
