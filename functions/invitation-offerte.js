// Plan offert (lien d'invitation) et invitation virement.
// Decisions pures + ecriture Firestore injectee : aucun appel reseau,
// aucun compte reel. Le lien reste ?invitation=CODE (survit a la
// connexion, au rechargement et a la redirection du domaine). Il ne
// contient pas coach=questionnaire, reserve au retour Mollie.
//
// Une invitation sans mode (documents deja en base) reste un virement.
// Rien ici ne reecrit les dossiers existants.

const MODE_OFFERT = "offert";
const MODE_VIREMENT = "virement";
const MONTANT_OFFERT = "0 EUR";
const MONTANT_VIREMENT = 80;

function normaliserEmail(x) {
  return String(x == null ? "" : x).trim().toLowerCase();
}

function emailValide(e) {
  return e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Mode explicite. Tout document ancien, sans mode, reste un virement. */
function modeDe(inv) {
  return inv && inv.mode === MODE_OFFERT ? MODE_OFFERT : MODE_VIREMENT;
}

function lienInvitation(code) {
  return "https://belfit.be/?invitation=" + code;
}

/** Ce que le coach a le droit de creer. L'adresse est obligatoire. */
function preparerOfferte({email, note}) {
  const e = normaliserEmail(email);
  if (!emailValide(e)) return {ok: false, motif: "email"};
  return {
    ok: true,
    email: e,
    note: String(note || "").trim().slice(0, 80),
    mode: MODE_OFFERT,
    type: "plan",
    montant: MONTANT_OFFERT,
  };
}

function commandeDe(mode, code, le) {
  if (mode === MODE_OFFERT) {
    return {
      type: "plan",
      payeLe: le,
      source: MODE_OFFERT,
      commande: code,
      montant: MONTANT_OFFERT,
    };
  }
  return {
    type: "plan",
    payeLe: le,
    source: "invitation",
    commande: code,
    virement: {statut: "attente", montant: MONTANT_VIREMENT, communication: code},
  };
}

/**
 * Decide sans ecrire.
 * compte : { uid, email, verifie }
 * existant : commandeCoach deja sur le compte, ou null
 * Retour : { ok, motif?, deja?, mode?, marquer? }
 *  - marquer : le compte a deja cette offre, mais le lien n'est pas encore marque utilise
 */
function decider({inv, compte, existant, code}) {
  if (!inv) return {ok: false, motif: "inconnue"};
  const uid = compte && compte.uid;
  if (!uid) return {ok: false, motif: "auth"};
  const mode = modeDe(inv);
  if (inv.utilisePar && inv.utilisePar !== uid) return {ok: false, motif: "utilisee"};
  if (inv.utilisePar === uid) return {ok: true, deja: true, mode};

  if (mode === MODE_OFFERT) {
    const attendu = normaliserEmail(inv.email);
    const recu = normaliserEmail(compte.email);
    if (!attendu || !recu || recu !== attendu) return {ok: false, motif: "adresse"};
    if (compte.verifie !== true) return {ok: false, motif: "verification"};
    if (existant && existant.source === MODE_OFFERT && existant.commande === code) {
      return {ok: true, deja: true, mode, marquer: true};
    }
    // Ne jamais ecraser un coaching deja pose (Mollie, virement, autre offre).
    if (existant && existant.payeLe) return {ok: false, motif: "deja_commande"};
  }

  return {ok: true, deja: false, mode};
}

/** Questionnaire envoye et pas encore suivi d'un programme livre apres lui. */
function entreFile({envoyeLe, livreLe}) {
  return !!envoyeLe && (!livreLe || new Date(livreLe) < new Date(envoyeLe));
}

/**
 * Consomme le lien dans une transaction. N'ecrit ni l'acces nutrition,
 * ni l'acces PRO, ni un quota IA. Le virement garde son comportement
 * (ecrase la commande, montant 80, virement en attente).
 */
async function consommer(db, {code, uid, email, verifie}) {
  const ref = db.collection("invitations").doc(code);
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const s2 = await tx.get(ref);
    const inv = s2.exists ? s2.data() : null;
    const su = await tx.get(userRef);
    const existant = su.exists && su.data() ? (su.data().commandeCoach || null) : null;
    const d = decider({inv, compte: {uid, email, verifie: verifie === true}, existant, code});
    if (!d.ok) return d;
    if (d.deja) {
      if (d.marquer) {
        tx.set(ref, {
          utilisePar: uid,
          utiliseLe: (inv && inv.utiliseLe) || new Date().toISOString(),
          email: (inv && inv.email) || email || null,
        }, {merge: true});
      }
      return {ok: true, type: "plan", mode: d.mode, deja: true};
    }
    const le = new Date().toISOString();
    const emailNote = d.mode === MODE_OFFERT ? (inv.email || null) : (email || null);
    tx.set(ref, {utilisePar: uid, utiliseLe: le, email: emailNote}, {merge: true});
    tx.set(userRef, {commandeCoach: commandeDe(d.mode, code, le)}, {merge: true});
    return {ok: true, type: "plan", mode: d.mode};
  });
}

function statutHttp(resultat) {
  if (!resultat || resultat.ok) return 200;
  if (resultat.motif === "code") return 400;
  if (resultat.motif === "auth") return 401;
  return 409;
}

module.exports = {
  MODE_OFFERT,
  MODE_VIREMENT,
  MONTANT_OFFERT,
  MONTANT_VIREMENT,
  normaliserEmail,
  modeDe,
  lienInvitation,
  preparerOfferte,
  commandeDe,
  decider,
  entreFile,
  consommer,
  statutHttp,
};
