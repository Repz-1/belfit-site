// ============================================================
// MODELE « REBOND APRES SECHE » (26/10, Raci) — pre-remplissage de la
// page coach, 8 versions, SANS aucune date de debut : c'est le coach
// qui les fixe (une date inventee ferait appliquer un plan trop tot).
//
// Origine : plan du partenaire sportif (27/10) pour un ami de 99 kg, valide
// par Raci seulement pour la PREPARATION : 6 repas, riz basmati, creme de
// riz, glucides a chaque repas, proteines fixes (~240 g), calories en hausse
// d'environ 150 kcal par semaine sur 8 semaines. Les calories sont des
// ESTIMATIONS, calculees avec la base d'aliments de l'app.
//
// Le plan de depart (version 1) puis, pour chaque version, ce qu'on
// AJOUTE (en grammes) a la precedente. Un aliment absent du repas y est
// ajoute. Chaque version est donc la somme des changements jusque-la.
//
// Equivalences avec la base d'aliments (pas d'entree exacte) :
//   « fruits rouges » -> Framboises ; « legumes verts » -> Brocoli ;
//   « salade » -> Salade verte ; « vinaigre de cidre » -> Vinaigre blanc
//   (quasi 0 kcal) ; « 1 banane facultative » -> Banane 100 g, comptee.
// ============================================================

const DEPART = [
  { nom: 'Repas 1', ings: [['Whey', 30], ['Avoine', 60], ['Framboises', 100], ['Amandes', 10], ['Cannelle', 1]] },
  { nom: 'Repas 2', ings: [['Poulet cru', 170], ['Riz basmati cru', 90], ['Concombre', 150], ['Huile de lin', 10]] },
  { nom: 'Repas 3', ings: [['Poulet cru', 170], ['Riz basmati cru', 90], ['Salade verte', 200], ['Vinaigre blanc', 10], ['Huile de lin', 10]] },
  { nom: 'Repas 4', ings: [['Crème de riz', 70], ['Whey', 30], ['Banane', 100], ['Sel de table', 1]] },
  { nom: 'Repas 5', ings: [['Haché de boeuf 5% cru', 180], ['Pomme de terre (crue)', 300], ['Brocoli', 150], ['Huile de lin', 10]] },
  { nom: 'Repas 6', ings: [['Yaourt 0%', 500], ['Avoine', 40], ['Noix', 15], ['Kiwi', 75]] },
];

// [indice du repas (0 = Repas 1), aliment, grammes en plus]
const CHANGEMENTS = [
  { libelle: 'Semaine 1', plus: [] },
  { libelle: 'Semaine 2', plus: [[1, 'Riz basmati cru', 20], [2, 'Riz basmati cru', 20]] },
  { libelle: 'Semaine 3', plus: [[0, 'Avoine', 20], [4, 'Pomme de terre (crue)', 100]] },
  { libelle: 'Semaine 4', plus: [[0, 'Huile de lin', 10], [3, 'Crème de riz', 20]] },
  { libelle: 'Semaine 5', plus: [[1, 'Riz basmati cru', 20], [2, 'Riz basmati cru', 20]] },
  { libelle: 'Semaine 6', plus: [[5, 'Noix', 10], [3, 'Crème de riz', 20]] },
  { libelle: 'Semaine 7', plus: [[0, 'Avoine', 20], [4, 'Pomme de terre (crue)', 100]] },
  { libelle: 'Semaine 8', plus: [[1, 'Riz basmati cru', 20], [2, 'Riz basmati cru', 20]] },
];

/** Les 8 versions du rebond, sans date (debut: ''). Copie neuve a chaque appel. */
export function modeleRebond() {
  let courant = DEPART.map(r => ({ nom: r.nom, ings: r.ings.map(([name, portion]) => ({ name, portion })) }));
  return CHANGEMENTS.map(c => {
    c.plus.forEach(([ri, name, g]) => {
      const ing = courant[ri].ings.find(i => i.name === name);
      if (ing) ing.portion += g; else courant[ri].ings.push({ name, portion: g });
    });
    return {
      libelle: c.libelle,
      debut: '',
      repas: courant.map(r => ({ nom: r.nom, ings: r.ings.map(i => ({ ...i })) })),
    };
  });
}
