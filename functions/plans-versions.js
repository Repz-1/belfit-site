"use strict";
// ============================================================
// PLANS PAR DATE (26/10, Raci) — controle cote serveur des versions
// d'un plan alimentaire. Module pur (aucun acces Firebase) : il est
// teste par tools/test-plans-par-date.mjs.
//
// Forme d'une version stockee :
//   { debut: "AAAA-MM-JJ" | null, libelle, kcal, prot, carbs, lip, repas }
// Le serveur N'INVENTE JAMAIS de date : une date absente ou fausse
// devient null, et l'app n'applique pas une version sans date.
// ============================================================

const MAX_VERSIONS = 12;

function nombre(v, min, max) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
}

/** « AAAA-MM-JJ » reel (31 fevrier refuse), sinon null. */
function jourValide(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T12:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
}

/** Les repas d'une version, nettoyes comme ceux d'un plan unique. */
function nettoyerRepas(brut) {
  return (Array.isArray(brut) ? brut : []).slice(0, 12).map((r) => ({
    nom: String((r && r.nom) || "Repas").slice(0, 60),
    ings: (Array.isArray(r && r.ings) ? r.ings : []).slice(0, 40)
      .map((i) => ({
        name: String((i && i.name) || "").slice(0, 90),
        portion: Math.max(0, Math.round(Number(i && i.portion) || 0)),
      }))
      .filter((i) => i.name && i.portion > 0),
  })).filter((r) => r.ings.length);
}

/**
 * Valide la liste de versions envoyee par la page coach.
 * @returns {{ok:true, versions:object[]} | {ok:false, motif:string}}
 *  motif : "versions" (liste vide / trop longue), "valeurs" (kcal ou
 *  macros hors bornes), "repas" (une version sans aucun aliment).
 */
function normaliserVersions(brutes) {
  if (!Array.isArray(brutes) || !brutes.length || brutes.length > MAX_VERSIONS) {
    return {ok: false, motif: "versions"};
  }
  const versions = [];
  for (const b of brutes) {
    const v = {
      kcal: nombre(b && b.kcal, 800, 8000),
      prot: nombre(b && b.prot, 20, 600),
      carbs: nombre(b && b.carbs, 20, 1200),
      lip: nombre(b && b.lip, 10, 400),
    };
    if (v.kcal === null || v.prot === null || v.carbs === null || v.lip === null) {
      return {ok: false, motif: "valeurs"};
    }
    const repas = nettoyerRepas(b && b.repas);
    if (!repas.length) return {ok: false, motif: "repas"};
    versions.push({
      debut: jourValide(b && b.debut),
      libelle: String((b && b.libelle) || "").trim().slice(0, 60),
      ...v,
      repas,
    });
  }
  return {ok: true, versions};
}

/** Version qui sert de plan « de tete » (e-mail, anciennes versions de
 *  l'app) : la premiere par date, sinon la premiere de la liste. */
function premiereVersion(versions) {
  const datees = versions.filter((v) => v.debut)
    .sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0));
  return datees[0] || versions[0];
}

/**
 * Ancien plan a garder jusqu'a la premiere date : celui que le client
 * avait deja (sans versions), ou le `precedent` deja conserve par un
 * depot precedent. null si le client n'avait rien.
 */
function ancienPlan(existant) {
  if (!existant || typeof existant !== "object") return null;
  const source = Array.isArray(existant.versions) && existant.versions.length ?
    existant.precedent : existant;
  if (!source || !Array.isArray(source.repas) || !source.repas.length) return null;
  const garde = {
    kcal: source.kcal, prot: source.prot, carbs: source.carbs, lip: source.lip,
    repas: source.repas, livreLe: source.livreLe || null,
  };
  return garde.kcal > 0 ? garde : null;
}

module.exports = {
  MAX_VERSIONS, jourValide, normaliserVersions, premiereVersion, ancienPlan,
};
