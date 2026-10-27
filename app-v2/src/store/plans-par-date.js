// ============================================================
// PLANS PAR DATE (26/10, Raci) — logique pure, sans signaux.
//
// Un plan alimentaire peut porter plusieurs VERSIONS, chacune avec une
// date de debut (ex. rebond de prise de masse : semaines 1, 2, 3, 4,
// puis une version 5 valable jusqu'a la semaine 8).
//
// FORME stockee par le serveur (users/{uid}.programme) :
//   { kcal, prot, carbs, lip, repas, note, livreLe, ...      <- champs d'hier
//     versions?: [{ debut: 'AAAA-MM-JJ' | null, libelle,
//                   kcal, prot, carbs, lip, repas }],
//     precedent?: { kcal, prot, carbs, lip, repas, livreLe } }
// Sans `versions`, c'est le plan unique d'avant : rien ne change.
//
// REGLES (documentees ici, testees dans tools/test-plans-par-date.mjs) :
//  1. Le jour se lit en heure de BRUXELLES (Europe/Brussels), pas en
//     UTC : une version qui commence le 3 nov. commence a 00h00
//     heure belge, ete comme hiver.
//  2. Version active = la derniere (date de debut la plus tardive) dont
//     le debut est <= aujourd'hui. Deux versions a la meme date : celle
//     qui vient apres dans la liste l'emporte.
//  3. Une version SANS date n'est jamais appliquee (ni avant ni apres).
//  4. Avant la premiere date : si le coach avait deja livre un plan
//     (`precedent`), on garde ce plan jusqu'au jour J ; sinon rien du
//     plan n'est applique (aucun repas pose, objectifs inchanges) et
//     l'appli dit quand le plan commence.
//  5. Le dernier palier reste actif sans fin : la version 5 vaut pour
//     les semaines 5 a 8 et au-dela, jusqu'a une nouvelle livraison.
// ============================================================

const FUSEAU = 'Europe/Brussels';
const FORMAT_JOUR = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** Jour calendaire a Bruxelles, « AAAA-MM-JJ ». */
export function dateBruxelles(quand = new Date()) {
  const d = quand instanceof Date ? quand : new Date(quand);
  if (isNaN(d.getTime())) return null;
  return FORMAT_JOUR.format(d);
}

/**
 * 27/10 Raci : « aujourd'hui » du journal, des stats, des pesees et des
 * seances = le jour de Bruxelles (a minuit belge, les 24 h sont ecoulees).
 * Avant, la cle etait le jour UTC : elle changeait a 01h/02h belges.
 * Jamais null : secours sur le jour UTC si Intl echoue ou si la date est invalide.
 */
export function aujourdhuiBxl(quand = new Date()) {
  const j = dateBruxelles(quand);
  if (j) return j;
  const d = new Date(quand);
  return (isNaN(d.getTime()) ? new Date() : d).toISOString().slice(0, 10);
}

/** « AAAA-MM-JJ » reel (le 31 fevrier est refuse), sinon null. */
export function jourValide(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T12:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
}

/** Ajoute n jours calendaires a un « AAAA-MM-JJ ». */
export function ajouterJours(s, n) {
  const j = jourValide(s);
  if (!j) return null;
  const d = new Date(j + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Le plan porte-t-il des versions ? */
export function aDesVersions(pr) {
  return !!(pr && Array.isArray(pr.versions) && pr.versions.length);
}

/**
 * Version a appliquer le jour `jour` (« AAAA-MM-JJ », Bruxelles).
 * @returns {{index:number, version:object}|null}
 *  index = place dans la liste d'origine. null = aucune ne s'applique
 *  (avant la premiere date, ou aucune version datee).
 */
export function choisirVersion(versions, jour) {
  if (!Array.isArray(versions) || !jourValide(jour)) return null;
  let meilleur = null;
  versions.forEach((v, index) => {
    const debut = jourValide(v && v.debut);
    if (!debut || debut > jour) return;
    // <= : a date egale, la plus tardive de la liste l'emporte (regle 2)
    if (!meilleur || debut >= meilleur.debut) meilleur = { index, version: v, debut };
  });
  return meilleur ? { index: meilleur.index, version: meilleur.version } : null;
}

/** Prochaine version datee strictement apres `jour`, ou null. */
export function prochaineVersion(versions, jour) {
  if (!Array.isArray(versions)) return null;
  let p = null;
  versions.forEach((v, index) => {
    const debut = jourValide(v && v.debut);
    if (!debut || debut <= jour) return;
    if (!p || debut < p.debut) p = { index, version: v, debut };
  });
  return p;
}

const CHAMPS = ['kcal', 'prot', 'carbs', 'lip', 'repas'];
const sansVersions = (pr) => {
  const { versions, precedent, ...reste } = pr;
  return reste;
};

// Meme objet tant que (plan, version retenue) ne changent pas : les
// effets de l'appli qui lisent `programme` ne se rejouent pas pour rien.
let cache = { brut: null, cle: null, resolu: null };

/**
 * Plan a montrer au client le jour `jour`.
 *  - plan sans versions : renvoye tel quel (meme objet) ;
 *  - version active : champs du plan = ceux de la version, plus
 *      `versionActive` { index, n, total, debut, libelle } et
 *      `versionCle` (sert de marqueur au semis du journal) ;
 *      `prochaine` { debut, libelle } si une suivante est datee ;
 *  - avant la 1re date, avec `precedent` : l'ancien plan, + `prochaine` ;
 *  - avant la 1re date, sans `precedent` (ou aucune date) : plan vide
 *      (kcal 0, repas []) + `enAttente` { debut | null }.
 */
export function resoudreProgramme(brut, jour) {
  if (!aDesVersions(brut)) return brut || null;
  const cle = (jourValide(jour) || '?') + '|' + choisirIndex(brut.versions, jour) + '|' + prochaineCle(brut.versions, jour);
  if (cache.brut === brut && cache.cle === cle) return cache.resolu;

  const choix = choisirVersion(brut.versions, jour);
  const suite = prochaineVersion(brut.versions, jour);
  const prochaine = suite ? { debut: suite.debut, libelle: suite.version.libelle || '', kcal: +suite.version.kcal || 0 } : null;
  let resolu;

  if (choix) {
    const v = choix.version;
    resolu = { ...sansVersions(brut) };
    CHAMPS.forEach(k => { if (v[k] !== undefined) resolu[k] = v[k]; });
    resolu.versionActive = {
      index: choix.index,
      n: choix.index + 1,
      total: brut.versions.length,
      debut: jourValide(v.debut),
      libelle: v.libelle || '',
    };
    resolu.versionCle = 'v' + (choix.index + 1) + '@' + jourValide(v.debut);
    if (prochaine) resolu.prochaine = prochaine;
  } else if (brut.precedent && Array.isArray(brut.precedent.repas) && brut.precedent.repas.length) {
    resolu = { ...sansVersions(brut) };
    CHAMPS.forEach(k => { if (brut.precedent[k] !== undefined) resolu[k] = brut.precedent[k]; });
    if (brut.precedent.livreLe) resolu.livreLe = brut.precedent.livreLe;   // « livre il y a X jours » = l'ancien plan
    resolu.versionCle = 'precedent';
    if (prochaine) resolu.prochaine = prochaine;
  } else {
    resolu = { ...sansVersions(brut), kcal: 0, prot: 0, carbs: 0, lip: 0, repas: [],
      enAttente: { debut: suite ? suite.debut : null }, versionCle: 'attente' };
  }
  cache = { brut, cle, resolu };
  return resolu;
}

function choisirIndex(versions, jour) {
  const c = choisirVersion(versions, jour);
  return c ? c.index : -1;
}
function prochaineCle(versions, jour) {
  const p = prochaineVersion(versions, jour);
  return p ? p.debut : '-';
}
