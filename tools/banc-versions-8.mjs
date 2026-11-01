// BANC DE TEST UNIQUEMENT (01/11) : 8 versions fictives d'un plan, pour tester
// l'affichage des plans par date dans l'appli. Ce n'est PLUS un modele de la
// page coach (retire a la demande de Raci) ; rien dans l'app ne l'importe.

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
  { libelle: 'Version 1', plus: [] },
  { libelle: 'Version 2', plus: [[1, 'Riz basmati cru', 20], [2, 'Riz basmati cru', 20]] },
  { libelle: 'Version 3', plus: [[0, 'Avoine', 20], [4, 'Pomme de terre (crue)', 100]] },
  { libelle: 'Version 4', plus: [[0, 'Huile de lin', 10], [3, 'Crème de riz', 20]] },
  { libelle: 'Version 5', plus: [[1, 'Riz basmati cru', 20], [2, 'Riz basmati cru', 20]] },
  { libelle: 'Version 6', plus: [[5, 'Noix', 10], [3, 'Crème de riz', 20]] },
  { libelle: 'Version 7', plus: [[0, 'Avoine', 20], [4, 'Pomme de terre (crue)', 100]] },
  { libelle: 'Version 8', plus: [[1, 'Riz basmati cru', 20], [2, 'Riz basmati cru', 20]] },
];

/** 8 versions de test, sans date (debut: ''). Copie neuve a chaque appel. */
export function versionsDeTest() {
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
