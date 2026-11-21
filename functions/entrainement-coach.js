// ============================================================
// PROGRAMME D'ENTRAINEMENT DU COACH (21/11, Raci).
//
// Meme principe que le plan alimentaire : Raci compose dans son espace
// coach (mode « Entraînement », bleu) et l'envoie au compte du client,
// une fois le paiement recu hors app. Le client ne note que ses poids
// (disques d'un cote a la barre, poids d'un haltere, poids affiche a la
// poulie ou a la machine) et coche les series faites.
//
//  users/{uid}.entrainementCoach  ecrit ICI seulement (regle Firestore)
//  users/{uid}.v2Data.carnetCoach ecrit par l'app du client
// ============================================================

const TYPES = ["barre", "halteres", "poulie", "machine", "kettlebell", "corps"];

const texte = (v, max) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
const entier = (v, min, max, defaut) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
};
const ident = (v, defaut) => {
  const s = String(v || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  return s || defaut;
};

/** Corps envoye par la page coach -> programme propre, ou motif d'erreur. */
function normaliserEntrainement(b) {
  const brut = Array.isArray(b && b.seances) ? b.seances.slice(0, 7) : [];
  const vus = new Set();
  const seances = brut.map((s, i) => {
    let id = ident(s && s.id, "s" + (i + 1));
    while (vus.has(id)) id += "x";
    vus.add(id);
    const jour = s && s.jour !== null && s.jour !== "" && s.jour !== undefined ?
      entier(s.jour, 0, 6, null) : null;
    const exosVus = new Set();
    const exos = (Array.isArray(s && s.exos) ? s.exos : []).slice(0, 15).map((e, k) => {
      let eid = ident(e && e.id, "e" + (k + 1));
      while (exosVus.has(eid)) eid += "x";
      exosVus.add(eid);
      return {
        id: eid,
        nom: texte(e && e.nom, 80),
        imgId: texte(e && e.imgId, 80) || null,
        type: TYPES.includes(e && e.type) ? e.type : "machine",
        series: entier(e && e.series, 1, 10, 3),
        reps: texte(e && e.reps, 12) || "10",
        repos: entier(e && e.repos, 0, 600, 90),
        note: texte(e && e.note, 140),
      };
    }).filter((e) => e.nom);
    return {id, nom: texte(s && s.nom, 40) || ("Séance " + String.fromCharCode(65 + i)), jour, exos};
  }).filter((s) => s.exos.length);
  if (!seances.length) return {ok: false, motif: "seances"};
  return {ok: true, entrainement: {
    seances,
    note: texte(b && b.note, 600),
    livreLe: new Date().toISOString(),
  }};
}

/** Carnet du client (v2Data.carnetCoach) -> derniers poids par exercice,
 *  pour la fiche du coach. Les 40 dernieres seances suffisent. */
function resumeCarnet(carnet) {
  if (!carnet || typeof carnet !== "object") return [];
  return Object.keys(carnet)
      .filter((k) => carnet[k] && typeof carnet[k] === "object")
      .sort().reverse().slice(0, 40)
      .map((k) => {
        const c = carnet[k];
        const exos = c.exos && typeof c.exos === "object" ? c.exos : {};
        return {
          cle: k,
          date: texte(c.date || k.slice(0, 10), 10),
          seance: texte(c.seance, 40),
          exos: Object.keys(exos).slice(0, 15).map((id) => {
            const x = exos[id] || {};
            return {
              id: texte(id, 24),
              nom: texte(x.nom, 80),
              kg: Number.isFinite(+x.kg) ? Math.round(+x.kg * 100) / 100 : null,
              detail: texte(x.detail, 80),
              faites: Array.isArray(x.faites) ? x.faites.filter(Boolean).length : 0,
              series: Array.isArray(x.faites) ? x.faites.length : 0,
            };
          }),
        };
      });
}

module.exports = {normaliserEntrainement, resumeCarnet, TYPES};
