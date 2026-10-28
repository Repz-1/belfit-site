import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { DB } from '../data/aliments.js';
import { customFoods } from '../components/Scanner.jsx';
import { ecritureBloquee } from './acces-nutrition.js';

// ============================================================
// FAVORIS, ALIMENTS COURANTS ET PLATS ENREGISTRES
//
// Deux listes, deux besoins distincts.
//
// Aliments courants : ceux qu'on encode le plus souvent, comptes
// automatiquement. L'app sait deja ce qu'on mange tous les jours ;
// le declarer a la main faisait le travail deux fois.
//
// Favoris : epingles a la main, pour l'aliment qu'on veut sous la
// main tout de suite sans attendre qu'il se hisse par la frequence.
// Ils passent devant les courants.
//
// L'etoile a ete retiree le 10/08 puis remise le meme jour : le
// defaut n'etait pas l'etoile mais son silence. Collee au nom qu'on
// tape pour choisir l'aliment, elle basculait sans qu'on le veuille
// et rien ne le signalait — c'est ainsi que l'avoine de Raci est
// devenue favorite sans decision. Elle revient avec un retour
// visible et une annulation d'un geste.
//
// Plats : une recette pesee une seule fois, a la cuisson, puis
// consommee en portions. Le batch cooking en pratique.
// ============================================================

export const usages = signal({});    // { nom: nombre d'encodages }
export const favoris = signal([]);   // aliments epingles a la main
export const plats = signal([]);     // { id, nom, ings, portions }
// Prenom : synchronise avec le compte. localStorage seul le perdait
// des qu'on changeait d'appareil ou de navigateur.
export const prenom = signal('');

// Sexe : 'h' ou 'f'. Il servait deja au calcul des besoins (Mifflin-St
// Jeor ajoute +5 ou -161 selon le cas), mais vivait dans l'etat local
// du calculateur et n'etait ecrit nulle part — l'app le redemandait a
// chaque visite et l'oubliait aussitot. Il devient une donnee de
// compte, comme le prenom, parce que la silhouette en depend aussi.
// Vide tant que rien n'a ete choisi : on n'invente pas un defaut qui
// afficherait un corps masculin a une utilisatrice.
export const sexe = signal('');

let uid = null, pret = false;

effect(() => {
  const u = identite.value;
  if (!u) { pret = false; return; }
  if (u === uid && pret) return;
  uid = u; pret = false;
  chargerDonnees(u).then(d => {
    if (uid !== u) return;
    favoris.value = (d && d.favoris) || [];
    usages.value = (d && d.usages) || {};
    plats.value = (d && d.plats) || [];
    // Le prenom du compte fait foi. S'il manque au cloud mais existe
    // en local (compte cree avant cette synchro), on le remonte.
    const local = (() => {
      try { return localStorage.getItem('repz_firstName') || ''; } catch (e) { return ''; }
    })();
    const duCompte = (d && d.prenom) || '';
    prenom.value = duCompte || local;
    sexe.value = (d && d.sexe) || (() => {
      try { return localStorage.getItem('repz_sexe') || ''; } catch (e) { return ''; }
    })();
    if (!duCompte && local) sauvegarder(u, { prenom: local });
    // Miroir local : l'en-tete s'affiche sans attendre le reseau.
    try { if (prenom.value) localStorage.setItem('repz_firstName', prenom.value); } catch (e) {}
    try { if (sexe.value) localStorage.setItem('repz_sexe', sexe.value); } catch (e) {}
    pret = true;
  });
});

effect(() => {
  const instantane = {
    favoris: favoris.value, usages: usages.value,
    plats: plats.value, prenom: prenom.value, sexe: sexe.value,
  };
  const u = identite.value;
  if (!u || !pret) return;   // ne pas ecraser avant le chargement
  sauvegarder(u, instantane);
});

// ---------- Favoris ----------
//
// Le comptage automatique fait remonter ce qu'on encode le plus.
// Les favoris repondent a un autre besoin : epingler un aliment
// qu'on veut avoir sous la main SANS attendre qu'il se hisse par la
// frequence — un aliment nouveau, ou un aliment de saison.

export function estFavori(nom) {
  return favoris.value.includes(nom);
}

export function basculerFavori(nom) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  favoris.value = estFavori(nom)
    ? favoris.value.filter(n => n !== nom)
    : [...favoris.value, nom];
}

// ---------- Aliments courants ----------

/** Un encodage de plus pour cet aliment. */
export function noterUsage(nom) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  usages.value = { ...usages.value, [nom]: (usages.value[nom] || 0) + 1 };
}

/** Les aliments les plus encodes, du plus frequent au moins frequent. */
export function alimentsCourants(max = 6) {
  return Object.entries(usages.value)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .slice(0, max)
    .map(([nom]) => nom);
}

/**
 * Bonus de classement d'un aliment dans la recherche. Plafonne a 25,
 * la valeur que portaient les favoris : au-dela, un aliment tres
 * encode ecraserait un resultat exact et « riz » ne proposerait plus
 * « Riz au lait ». Il faut trois encodages pour atteindre le plafond.
 */
export function bonusUsage(nom) {
  // Un favori epingle passe devant tout aliment simplement frequent :
  // c'est un choix explicite, il prime sur une statistique.
  const base = estFavori(nom) ? 32 : 0;
  return base + Math.min(25, (usages.value[nom] || 0) * 9);
}

// ---------- Plats ----------

/** Macros d'un ingredient, quelle que soit sa provenance. */
function macrosIngredient(ing) {
  const d = DB[ing.name] || customFoods.value[ing.name];
  if (!d) return { kcal: 0, prot: 0, carbs: 0, lip: 0 };
  const f = (ing.portion || 0) / 100;
  return {
    kcal: (d.kcal || 0) * f,
    prot: (d.prot || 0) * f,
    carbs: (d.carbs || 0) * f,
    lip: (d.lip || 0) * f,
  };
}

/** Macros du plat entier, tous ingredients confondus. */
export function totauxPlat(plat) {
  return (plat.ings || []).reduce((acc, i) => {
    const m = macrosIngredient(i);
    return {
      kcal: acc.kcal + m.kcal, prot: acc.prot + m.prot,
      carbs: acc.carbs + m.carbs, lip: acc.lip + m.lip,
    };
  }, { kcal: 0, prot: 0, carbs: 0, lip: 0 });
}

/** Macros d'UNE portion : c'est ce que l'utilisateur consomme. */
export function macrosPortion(plat) {
  const t = totauxPlat(plat);
  const n = Math.max(1, plat.portions || 1);
  return { kcal: t.kcal / n, prot: t.prot / n, carbs: t.carbs / n, lip: t.lip / n };
}

export function enregistrerPlat(plat) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  const existe = plats.value.some(p => p.id === plat.id);
  plats.value = existe
    ? plats.value.map(p => (p.id === plat.id ? plat : p))
    : [...plats.value, { ...plat, id: plat.id || Date.now() }];
}

export function supprimerPlat(id) {
  if (ecritureBloquee()) return;   // blocage alimentation : lecture seule
  plats.value = plats.value.filter(p => p.id !== id);
}


/** Change le prenom : compte d'abord, miroir local ensuite. */
export function definirPrenom(v) {
  const p = String(v || '').trim();
  prenom.value = p;
  try { localStorage.setItem('repz_firstName', p); } catch (e) {}
}
