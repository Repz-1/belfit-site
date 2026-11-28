// ============================================================
// NOTIFICATIONS (28/11, Raci) — sur le telephone du client, en plus de
// l'e-mail et de la bulle a l'ouverture de l'app.
//
// Quatre moments, choisis par Raci : plan alimentaire recu, programme
// d'entrainement recu, questionnaire a remplir, petit mot du coach.
// Style valide 28/11 : notification blanche, grande image en degrade
// creme -> jaune -> peche avec le logo BF (v2/notif/*.png), ton positif.
//
// Les jetons (un par telephone) sont ecrits par l'app dans
// users/{uid}.pushJetons quand le client active les notifications
// (Reglages). Messages « data » seulement : c'est le service worker de
// l'app (v2/push-sw.js) qui affiche la notification, avec l'image.
// Un jeton mort (appli desinstallee, notifications coupees) est retire.
// Ne jette jamais : une notification ratee n'annule pas un envoi de plan.
// ============================================================
const admin = require("firebase-admin");

const IMG = "https://www.belfit.be/v2/notif/";
const MODELES = {
  plan: {titre: "Ton nouveau plan est là", texte: "Préparé rien que pour toi. On s'y met ?", image: "plan", url: "/v2/?onglet=premium"},
  entrainement: {titre: "Ton programme d'entraînement est là", texte: "Tes séances t'attendent. On s'y met ?", image: "entrainement", url: "/v2/?onglet=journal"},
  questionnaire: {titre: "Ton questionnaire t'attend", texte: "Quelques minutes, et ton programme te ressemble.", image: "questionnaire", url: "/v2/?onglet=journal"},
  message: {titre: "Un petit mot de Raci", texte: "", image: "message", url: "/v2/"},
};
const MORTS = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"]);

/** Contenu d'une notification (pur, testable). */
function contenu(type, extra = {}) {
  const m = MODELES[type];
  if (!m) return null;
  const texte = String(extra.texte || m.texte).slice(0, 180);
  return {titre: extra.titre || m.titre, texte, image: IMG + m.image + ".png", icone: IMG + "icone.png",
    badge: IMG + "badge.png", url: m.url, tag: "belfit-" + type, type};
}

/** Envoie a tous les telephones du compte. Rend {envoyes, appareils}. */
async function envoyer(uid, type, extra = {}) {
  const c = contenu(type, extra);
  if (!uid || !c) return {envoyes: 0, appareils: 0};
  try {
    const db = admin.firestore();
    const ref = db.collection("users").doc(uid);
    const s = await ref.get();
    const jetons = s.exists && s.data().pushJetons && typeof s.data().pushJetons === "object" ? s.data().pushJetons : {};
    const cles = Object.keys(jetons).filter((k) => jetons[k] && typeof jetons[k].jeton === "string");
    if (!cles.length) return {envoyes: 0, appareils: 0};
    const rep = await admin.messaging().sendEachForMulticast({
      tokens: cles.map((k) => jetons[k].jeton),
      data: c,
      webpush: {headers: {Urgency: "high", TTL: String(3 * 24 * 3600)}},
    });
    const morts = {};
    rep.responses.forEach((r, i) => {
      if (!r.success && r.error && MORTS.has(r.error.code)) morts["pushJetons." + cles[i]] = admin.firestore.FieldValue.delete();
    });
    if (Object.keys(morts).length) await ref.update(morts).catch(() => {});
    return {envoyes: rep.successCount, appareils: cles.length};
  } catch (e) {
    console.error("Notification", type, uid, e);
    return {envoyes: 0, appareils: 0, erreur: true};
  }
}

module.exports = {envoyer, contenu, MODELES};
