// ACCES NUTRITION (blocage de l'alimentation sans acces actif).
// Source de verite : le champ `accesNutritionJusqu` (Timestamp) du document
// users/{uid}. Il n'est ecrit QUE par le serveur (les regles Firestore
// refusent toute ecriture venant du navigateur).
//
// Interrupteur serveur : le document config/acces { blocage: true }.
// Tant qu'il n'existe pas, ou vaut false, RIEN n'est bloque : une
// publication accidentelle ne bloque donc personne.
//
// Ce fichier ne depend de firebase-admin que pour fabriquer des Timestamp ;
// les fonctions de calcul sont pures et testees sans reseau.
const JOURS_ACCES = 44;                       // identique a mollie.js / app-v2 coach.js
const JOUR_MS = 86400000;
// Acces sans fin (comptes du proprietaire et du coach, offerts « illimites »).
const FIN_ILLIMITEE_MS = Date.UTC(9999, 11, 31);

/** Timestamp / Date / ISO / nombre -> millisecondes (null si illisible). */
function versMs(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "object" && typeof v.seconds === "number") return v.seconds * 1000;
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
}

/** L'acces nutrition est-il ouvert a cet instant ? */
function accesActif(userData, maintenantMs) {
  const fin = versMs(userData && userData.accesNutritionJusqu);
  if (fin === null) return false;
  return fin > (maintenantMs === undefined ? Date.now() : maintenantMs);
}

/**
 * Nouvelle fin d'acces. Ne raccourcit JAMAIS un acces existant.
 * - jours : paiement/virement/offre -> base + jours
 * - illimite : fin du monde
 * @param {*} actuelle  accesNutritionJusqu actuel (Timestamp, Date, ms, ISO ou null)
 * @param {{depuisMs?:number, jours?:number, illimite?:boolean}} o
 * @return {number} ms
 */
function nouvelleFin(actuelle, o) {
  const cur = versMs(actuelle);
  let cible;
  if (o.illimite) cible = FIN_ILLIMITEE_MS;
  else {
    const base = o.depuisMs === undefined ? Date.now() : o.depuisMs;
    cible = base + (o.jours === undefined ? JOURS_ACCES : o.jours) * JOUR_MS;
  }
  return cur !== null && cur > cible ? cur : cible;
}

/** Fin d'acces pour un acces « jusqu'au » ISO (null = sans fin). */
function nouvelleFinJusqu(actuelle, jusquISO) {
  if (!jusquISO) return nouvelleFin(actuelle, {illimite: true});
  const ms = Date.parse(jusquISO);
  return nouvelleFin(actuelle, {depuisMs: Number.isNaN(ms) ? Date.now() : ms, jours: 0});
}

/**
 * Ecrit l'acces (fusion) sur users/{uid}. Appel SERVEUR uniquement.
 * Ne leve jamais : un echec est journalise, le paiement/virement, lui, a deja eu lieu.
 */
async function accorderAcces(db, uid, o) {
  try {
    // o.jusquISO : acces « jusqu'au » (offre, code) ; sinon base + jours.
    
    const {Timestamp} = require("firebase-admin/firestore");
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    const actuelle = snap.exists ? snap.data().accesNutritionJusqu : null;
    const fin = o.jusquISO !== undefined ? nouvelleFinJusqu(actuelle, o.jusquISO) : nouvelleFin(actuelle, o);
    await ref.set({accesNutritionJusqu: Timestamp.fromMillis(fin)}, {merge: true});
    return fin;
  } catch (e) {
    console.error("accorderAcces :", e && e.message);
    if (o && o.strict) throw e;     // webhook de paiement : on veut un nouvel essai
    return null;
  }
}

// Interrupteur serveur, lu au plus une fois par minute et par instance.
let cacheBlocage = {ms: 0, v: false};
async function blocageActif(db, maintenantMs) {
  const now = maintenantMs === undefined ? Date.now() : maintenantMs;
  if (now - cacheBlocage.ms < 60000) return cacheBlocage.v;
  let v = false;
  try {
    const s = await db.collection("config").doc("acces").get();
    v = !!(s.exists && s.data().blocage === true);
  } catch (e) {
    console.error("blocageActif :", e && e.message);
    v = false;          // en cas de doute on ne bloque personne
  }
  cacheBlocage = {ms: now, v};
  return v;
}
function oublierCacheBlocage() { cacheBlocage = {ms: 0, v: false}; }

module.exports = {
  JOURS_ACCES, JOUR_MS, FIN_ILLIMITEE_MS,
  versMs, accesActif, nouvelleFin, nouvelleFinJusqu, accorderAcces, blocageActif, oublierCacheBlocage,
};
