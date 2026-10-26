// ============================================================
// MODELE « REBOND APRES SECHE » (26/10, Raci) — pre-remplissage de la
// page coach, 5 versions, SANS aucune date de debut : c'est le coach
// qui les fixe (une date inventee ferait appliquer un plan trop tot).
//
// Origine : plan en 6 repas par jour, proteines fixes (~250 g), calories
// en hausse d'environ 200 a 250 kcal par semaine ; la version 5 reste
// valable jusqu'a la semaine 8 (memes calories). Les calories sont des
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
  { nom: 'Repas 1', ings: [['Whey', 40], ['Avoine', 60], ['Framboises', 100], ['Amandes', 10], ['Cannelle', 1]] },
  { nom: 'Repas 2', ings: [['Poulet cru', 200], ['Riz basmati cru', 80], ['Concombre', 150], ["Huile d'olive", 10]] },
  { nom: 'Repas 3', ings: [['Poulet cru', 200], ['Riz basmati cru', 80], ['Salade verte', 200], ['Huile de lin', 10], ['Vinaigre blanc', 10]] },
  { nom: 'Repas 4 (après l\'entraînement)', ings: [['Crème de riz', 60], ['Whey', 30], ['Banane', 100], ['Sel de table', 1]] },
  { nom: 'Repas 5', ings: [['Haché de boeuf 5% cru', 200], ['Pomme de terre (crue)', 250], ['Brocoli', 150]] },
  { nom: 'Repas 6', ings: [['Yaourt 0%', 300], ['Avoine', 40], ['Noix', 15]] },
];

// [indice du repas (0 = Repas 1), aliment, grammes en plus]
const CHANGEMENTS = [
  { libelle: 'Semaine 1', plus: [] },
  { libelle: 'Semaine 2', plus: [[1, 'Riz basmati cru', 20], [2, 'Riz basmati cru', 20], [3, 'Crème de riz', 20]] },
  { libelle: 'Semaine 3', plus: [[0, 'Avoine', 20], [4, 'Pomme de terre (crue)', 50], [5, 'Huile de lin', 10]] },
  { libelle: 'Semaine 4', plus: [[1, 'Riz basmati cru', 20], [2, 'Riz basmati cru', 20], [0, 'Huile de lin', 10]] },
  { libelle: 'Semaines 5 à 8', plus: [[3, 'Crème de riz', 20], [5, 'Noix', 20], [4, 'Pomme de terre (crue)', 60]] },
];

/** Les 5 versions du rebond, sans date (debut: ''). Copie neuve a chaque appel. */
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
