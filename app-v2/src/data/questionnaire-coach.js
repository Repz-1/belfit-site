// Questionnaire du plan coach — v2 (26/09) : suit la banque de
// questions de Raci (Banque_Questions_Programme_Alimentaire), dans son
// ordre et avec ses libelles. Sections A a J, puis bonus L (facultatif),
// puis K (consentements) sur le recapitulatif. M = mise a jour 60 EUR.
// Retires sur demande de Raci : B7 D10 D11 F4 F6 F7 F8 G1 G6 I5 I6 I8 K5 L4,
// puis le 26/09 : A8 tutoiement, B6 pourquoi, C3 C4 C5 poids passes,
// E6 jours d'entrainement, E7 blessure, F11 plats livres, H4 style, H5 pesee.
//
// Types : un (choix unique, puces), tuiles (choix unique en grandes
// tuiles avec icone), plusieurs (choix multiples), nombre (compteur),
// echelle (1 a 10), texte, long (texte long), date.
// `aucun` : option exclusive d'un choix multiple. `autre` : ajoute
// « Autre » a preciser. `si` : question conditionnelle. `facultatif`.

const val = (r, id) => (r[id] || {}).valeur;
const vals = (r, id) => (r[id] || {}).valeurs || [];

// Aliments populaires par categorie (28/09). Libelles simples, proches
// des noms de la base : l'IA du coach les rattache a la base BELFIT.
const VIANDES = ['Blanc de poulet', 'Dinde', 'Bœuf haché 5%', 'Steak de bœuf', 'Jambon de dinde', 'Jambon'];
const POISSONS = ['Saumon', 'Thon', 'Cabillaud', 'Crevettes'];
const ANIMAUX = ['Œufs', 'Whey', 'Skyr', 'Yaourt nature', 'Fromage blanc', 'Lait demi-écrémé', 'Cottage cheese', 'Mozzarella', 'Emmental'];
export const CATEGORIES_ALIMENTS = [
  { nom: 'Protéines', min: 3, options: ['Blanc de poulet', 'Dinde', 'Bœuf haché 5%', 'Steak de bœuf', 'Saumon', 'Thon', 'Cabillaud', 'Crevettes', 'Œufs', 'Jambon de dinde', 'Jambon', 'Tofu', 'Lentilles', 'Pois chiches', 'Whey'] },
  { nom: 'Féculents', min: 3, options: ['Riz', 'Riz complet', 'Pâtes', 'Pâtes complètes', 'Pomme de terre', 'Patate douce', 'Quinoa', "Flocons d'avoine", 'Pain complet', 'Pain blanc', 'Wrap', 'Semoule', 'Boulgour'] },
  { nom: 'Légumes', min: 3, options: ['Brocoli', 'Courgette', 'Haricots verts', 'Épinards', 'Poivron', 'Carotte', 'Tomate', 'Champignons', 'Chou-fleur', 'Salade', 'Concombre', 'Poireau'] },
  { nom: 'Fruits', min: 3, options: ['Banane', 'Pomme', 'Fraises', 'Myrtilles', 'Orange', 'Kiwi', 'Mangue', 'Ananas', 'Poire', 'Raisin'] },
  { nom: 'Laitiers', min: 0, options: ['Skyr', 'Yaourt nature', 'Fromage blanc', 'Lait demi-écrémé', 'Cottage cheese', 'Mozzarella', 'Emmental', "Lait d'amande"] },
  { nom: 'Collations', min: 0, options: ['Amandes', 'Noix', 'Beurre de cacahuète', 'Chocolat noir', 'Barre protéinée', 'Galettes de riz', 'Fruits secs', 'Compote'] },
];
/** Options d'une categorie compatibles avec le regime declare. */
export function optionsAliments(cat, rep) {
  const regime = val(rep, 'regime');
  return cat.options.filter((o) => {
    if ((regime === 'Végétarien' || regime === 'Végan') && (VIANDES.includes(o) || POISSONS.includes(o))) return false;
    if (regime === 'Végan' && ANIMAUX.includes(o)) return false;
    if ((regime === 'Sans porc' || regime === 'Halal' || regime === 'Casher') && o === 'Jambon') return false;
    return true;
  });
}

export const PREMIER_PLAN = [
  { id: 'toi', icone: 'user', titre: 'Faisons connaissance', nom: 'Toi', sous: 'Pour personnaliser ton plan et nos échanges.', questions: [
    { id: 'prenom', label: 'Prénom', type: 'texte' },
    { id: 'nom', label: 'Nom', type: 'texte' },
    { id: 'email', label: 'E-mail', type: 'texte', clavier: 'email' },
    { id: 'telephone', label: 'Téléphone', type: 'texte', clavier: 'tel', facultatif: true },
    { id: 'age', label: 'Âge', type: 'nombre', saisie: true, unite: 'ans', min: 18, max: 90 },
    { id: 'sexe', label: 'Sexe', type: 'tuiles', options: [['Femme', 'gender-female'], ['Homme', 'gender-male']] },
    // « Autre » sans champ a preciser (Raci, 27/09).
    { id: 'source', label: 'Comment tu nous as connus ?', type: 'un', options: ['Instagram', 'TikTok', 'Un pote', 'Google', 'Un influenceur', 'Autre'] },
  ]},
  { id: 'objectif', icone: 'target', titre: "Qu'est-ce que tu veux obtenir ?", nom: 'Ton objectif', sous: 'Un seul choix : ton plan sera construit autour.', questions: [
    { id: 'objectif', label: 'Ton objectif principal', type: 'tuiles', options: [['Perdre du gras', 'flame'], ['Prendre du muscle', 'barbell'], ['Recomposition', 'arrows-exchange'], ['Énergie et santé', 'bolt']] },
    { id: 'urgent', label: 'Le point le plus urgent', type: 'un', autre: true, si: r => val(r, 'objectif') === 'Énergie et santé',
      options: ['Digestion', 'Fatigue', 'Sommeil', 'Analyses (glycémie, cholestérol…)'] },
    { id: 'echeance', label: 'Tu as une échéance ?', type: 'un', options: ['Pas de date', 'Dans 3 mois', 'Date précise'] },
    { id: 'echeanceDate', label: 'Quelle date ?', type: 'date', si: r => val(r, 'echeance') === 'Date précise' },
    { id: 'evenement', label: 'Il y a un événement derrière ? (mariage, été, compétition…)', type: 'texte', facultatif: true },
    { id: 'poidsVise', label: 'Poids que tu vises', type: 'nombre', saisie: true, unite: 'kg', min: 35, max: 250, facultatif: true },
    { id: 'motivation', label: "Motivation aujourd'hui", type: 'echelle', bas: 'Je me force', haut: 'Prêt à changer' },
    { id: 'confiance', label: "Confiance d'y arriver", type: 'echelle', bas: 'Pas du tout', haut: 'Totale' },
  ]},
  { id: 'mesures', icone: 'ruler-measure', titre: 'Tes mesures', nom: 'Tes mesures', sous: 'Pour calculer tes besoins au plus juste.', questions: [
    // Saisie directe au clavier (Raci, 26/09 : les + / − etaient trop lents).
    { id: 'poids', label: 'Poids actuel (ce matin si possible)', type: 'nombre', saisie: true, unite: 'kg', min: 35, max: 250 },
    { id: 'taille', label: 'Taille', type: 'nombre', saisie: true, unite: 'cm', min: 130, max: 220 },
    { id: 'tourTaille', label: 'Tour de taille (au nombril)', type: 'nombre', saisie: true, unite: 'cm', min: 40, max: 200, facultatif: true },
    { id: 'tourHanches', label: 'Tour de hanches', type: 'nombre', saisie: true, unite: 'cm', min: 50, max: 200, facultatif: true },
    { id: 'masseGrasse', label: '% masse grasse si tu le connais', type: 'nombre', saisie: true, unite: '%', min: 3, max: 60, facultatif: true },
    { id: 'activite', label: "Niveau d'activité au quotidien (hors sport)", type: 'un', options: ['Assis la plupart de la journée', 'Debout ou marche au travail', 'Métier physique'] },
    { id: 'pas', label: 'Pas par jour', type: 'un', facultatif: true, options: ['< 4 000', '4–7 000', '7–10 000', '> 10 000', 'Je ne sais pas'] },
  ]},
  { id: 'rythme', icone: 'clock', titre: 'Ton rythme et tes repas', nom: 'Ton rythme', sous: 'Pour caler les repas sur ta vraie journée.', questions: [
    { id: 'repasVoulus', label: 'Nombre de repas par jour que tu veux dans le plan (hors collations)', type: 'roulette', min: 1, max: 10 },
    { id: 'repasReels', label: 'Nombre de repas que tu fais vraiment aujourd\u2019hui', type: 'un', options: ['2', '3', '4', '5+', 'Ça change tout le temps'] },
    { id: 'journee', label: 'À quel rythme tu vis tes journées ?', type: 'un',
      options: ['Journée classique', 'Horaires décalés', 'Travail de nuit ou 3×8', 'Horaires variables'] },
    { id: 'reveil', label: 'Heure de réveil habituelle', type: 'texte', exemple: '6h30' },
    { id: 'coucher', label: 'Heure de coucher habituelle', type: 'texte', exemple: '23h' },
    { id: 'cuisine', label: 'Temps pour cuisiner un jour de semaine', type: 'un', options: ['Très peu (< 15 min)', 'Un peu (15–30)', "J'aime cuisiner (30 min et +)"] },
    { id: 'batch', label: 'Tu es ok pour cuisiner en avance (batch) ?', type: 'un', options: ['Déjà en place', 'OK pour apprendre', "Je n'aime pas réchauffer", 'Impossible'],
      info: "Le batch cooking, c'est cuisiner en une fois plusieurs repas à l'avance (par exemple le dimanche), puis les garder au frigo ou au congélateur pour la semaine." },
    { id: 'niveau', label: 'Niveau en cuisine', type: 'un', options: ['Je réchauffe', 'Les bases', "À l'aise", 'Passionné'] },
    { id: 'dehors', label: 'Repas hors domicile par semaine (midi + soir + week-end)', type: 'un', options: ['Aucun', '1', '2–4', '5 et plus'] },
    { id: 'budget', label: 'Budget courses par semaine, pour toi seul', type: 'un', options: ['Moins de 40 €', '40–70 €', '70–100 €', 'Plus de 100 €', 'Je ne sais pas'] },
    { id: 'materiel', label: 'Matériel dispo', type: 'plusieurs', exclusifs: ['Cuisine complète'],
      options: ['Cuisine complète', 'Four', 'Micro-ondes', 'Mixeur', 'Airfryer', 'Cuiseur riz', 'Congélo'] },
  ]},
  { id: 'entrainement', icone: 'barbell', titre: 'Ton entraînement', nom: 'Ton entraînement', sous: 'Ton plan suit ta dépense.', questions: [
    { id: 'seances', label: 'Séances par semaine', type: 'roulette', min: 0, max: 14 },
    { id: 'sport', label: 'Type', type: 'plusieurs', autre: true, si: r => +val(r, 'seances') > 0,
      options: ['Musculation', 'Cardio', 'Sport collectif', 'Mixte'] },
    { id: 'duree', label: "Durée typique d'une séance", type: 'un', si: r => +val(r, 'seances') > 0, options: ['< 30 min', '30–60', '60–90', '> 90'] },
    { id: 'intensite', label: 'Intensité ressentie', type: 'echelle', bas: 'Tranquille', haut: 'À fond', facultatif: true, si: r => +val(r, 'seances') > 0 },
    { id: 'creneau', label: 'Créneaux habituels', type: 'un', si: r => +val(r, 'seances') > 0, options: ['Matin', 'Midi', 'Soir', 'Ça change'] },
  ]},
  { id: 'alimentation', icone: 'salad', titre: 'Ce que tu manges', nom: 'Ce que tu manges', sous: 'Pour un plan que tu suivras vraiment.', questions: [
    { id: 'regime', label: 'Régime actuel', type: 'un', options: ['Tout', 'Sans porc', 'Halal', 'Casher', 'Flexitarien', 'Végétarien', 'Végan'] },
    { id: 'refuses', label: 'Aliments que tu refuses', type: 'long', exemple: 'Goût, éthique, texture…', facultatif: true },
    { id: 'allergie', label: 'As-tu une allergie ou une intolérance alimentaire ?', type: 'tuiles', options: [['Oui', 'alert-circle'], ['Non, aucune', 'circle-check']] },
    { id: 'allergies', label: 'Lesquelles ?', type: 'plusieurs', autre: true, si: r => val(r, 'allergie') === 'Oui',
      options: ['Arachide', 'Fruits à coque', 'Lait / lactose', 'Œuf', 'Poisson', 'Crustacés / mollusques', 'Gluten / blé', 'Sésame', 'Soja', 'Sulfites'] },
    { id: 'reaction', label: 'Quand tu en manges, que se passe-t-il ?', type: 'plusieurs', si: r => val(r, 'allergie') === 'Oui',
      options: ['Gêne digestive', 'Peau (plaques, démangeaisons)', 'Gonflement lèvres / langue / gorge', 'Malaises', "Je ne sais pas exactement, j'évite par précaution"] },
    { id: 'allergiePrecis', label: 'Précise en une ligne si besoin', type: 'texte', exemple: 'lactose ok en yaourt, pas en lait', facultatif: true, si: r => val(r, 'allergie') === 'Oui' },
    { id: 'plaisir', label: 'Aliments plaisir non négociables', type: 'long', exemple: 'Pain, fromage, chocolat, pizza du vendredi…', facultatif: true },
    { id: 'weekend', label: 'Ce qui change le week-end', type: 'long', exemple: 'Brunch, apéro, famille, alcool, grasse mat…', facultatif: true },
    { id: 'pain', label: 'Pain / viennoiseries par semaine', type: 'un', options: ['Jamais', '2–3 fois', 'Tous les jours', 'Plusieurs fois par jour'] },
    { id: 'fastfood', label: 'Fast-food par semaine', type: 'nombre', min: 0, max: 30, defaut: 0 },
    { id: 'sucreries', label: 'Sucreries / chocolat', type: 'un', options: ['Jamais', 'Rare', 'Quelques fois', 'Tous les jours'] },
  ]},
  // Aliments preferes (28/09, maquette validee) : ton plan est construit
  // avec eux en priorite (coach et IA). Au moins 3 par categorie principale.
  { id: 'favoris', icone: 'tools-kitchen', titre: 'Tes aliments', nom: 'Tes aliments', sous: 'Coche ce que tu aimes et manges facilement.', questions: [
    { id: 'favoris', label: 'Tes aliments préférés (au moins 3 par catégorie principale)', type: 'aliments', categories: CATEGORIES_ALIMENTS },
  ]},
  { id: 'boissons', icone: 'cup', titre: 'Tes boissons', nom: 'Tes boissons', sous: 'Les calories qui passent souvent inaperçues.', questions: [
    { id: 'eau', label: 'Eau par jour', type: 'un', options: ['Moins de 1 L', '1 à 2 L', 'Plus de 2 L', 'Je ne sais pas'] },
    { id: 'alcool', label: 'Alcool par semaine', type: 'un', options: ['Jamais', '1 à 3 verres', '4 à 7 verres', 'Plus de 7 verres'] },
    { id: 'cafe', label: 'Café par jour', type: 'nombre', unite: 'tasses', min: 0, max: 15, defaut: 0 },
    { id: 'sodas', label: 'Est-ce que tu bois des sodas ?', type: 'un', options: ['Non', 'Oui'] },
    { id: 'sodaType', label: 'Plutôt light ou plutôt sucrés ?', type: 'un', si: r => val(r, 'sodas') === 'Oui',
      options: ['Light / zéro', 'Sucrés (Coca, Orangina, ice tea sucré…)', 'Les deux'] },
    { id: 'sodaNb', label: 'Combien de sodas sucrés par semaine ?', type: 'nombre', min: 0, max: 50, defaut: 3,
      si: r => ['Sucrés (Coca, Orangina, ice tea sucré…)', 'Les deux'].includes(val(r, 'sodaType')) },
  ]},
  { id: 'difficultes', icone: 'puzzle', titre: 'Tes difficultés', nom: 'Tes difficultés', sous: 'Pour un plan qui tient dans la vraie vie.', questions: [
    { id: 'difficultes', label: "Tes difficultés aujourd'hui", type: 'plusieurs', aucun: 'Aucune',
      options: ['Grignotage', 'Sucre', 'Restaurants', 'Alcool', 'Pas le temps de cuisiner', 'Week-end qui annule la semaine', 'Faim entre les repas', 'Soirées difficiles', 'Aucune'] },
    { id: 'regimeEssaye', label: 'As-tu déjà essayé un régime ?', type: 'un', options: ['Non', 'Oui'] },
    { id: 'regimeMarche', label: 'Est-ce que ça a fonctionné ?', type: 'un', si: r => val(r, 'regimeEssaye') === 'Oui',
      options: ["Oui, j'avais eu des résultats", "Non, ça n'a pas tenu ou pas marché"] },
    { id: 'regimes', label: 'Quel(s) régime(s) as-tu essayé(s) ?', type: 'plusieurs', autre: true, si: r => (val(r, 'regimeMarche') || '').startsWith('Oui'),
      options: ['Calories comptées', 'Cétogène', 'Jeûne intermittent', 'WW / points', 'Appli gratuite', 'Coach'] },
    { id: 'echec', label: "Pourquoi ça n'a pas fonctionné ?", type: 'plusieurs', autre: true, si: r => (val(r, 'regimeMarche') || '').startsWith('Non'),
      options: ['Trop strict', 'Faim', 'Pas le temps', 'Vie sociale', 'Stress', 'Résultats trop lents', 'Budget', 'Plus de suivi', "Je n'avais pas de vrai pourquoi"] },
    { id: 'stress', label: 'Quand tu es stressé, avec la nourriture tu…', type: 'un', options: ["Perds l'appétit", 'Grignotes', 'Commandes', 'Te restreins plus', 'Ça ne change rien'] },
    { id: 'message', label: 'Message pour ton coach', type: 'long', exemple: 'Ce que le plan doit absolument prendre en compte', facultatif: true },
  ]},
  { id: 'sante', icone: 'heart-rate-monitor', titre: 'Ta santé', nom: 'Ta santé', sous: 'Quelques questions pour un plan sûr. Tes réponses restent entre toi et ton coach.', questions: [
    { id: 'suivi', label: "Un médecin suit-il actuellement l'un de ces points ?", type: 'plusieurs', autre: true, aucun: 'Aucun',
      options: ['Aucun', 'Thyroïde', 'Diabète ou prédiabète', 'SOPK', 'Digestion chronique', 'Traitement amaigrissant type GLP-1', 'Grossesse ou allaitement'],
      // Grossesse proposee seulement si la personne n'est pas un homme (Raci, 26/09).
      filtre: (o, r) => o !== 'Grossesse ou allaitement' || val(r, 'sexe') !== 'Homme' },
    { id: 'suiviPrecis', label: 'Précise si tu veux', type: 'long', facultatif: true, si: r => vals(r, 'suivi').some(x => x !== 'Aucun') },
    { id: 'traitements', label: 'Médicaments ou traitements en cours (y compris pilule, anticoagulant, antidépresseur…)', type: 'long', exemple: 'Nom et dose si tu les connais, ou « aucun »' },
    { id: 'complements', label: 'Compléments actuellement', type: 'long', exemple: 'Nom, dose et moment de prise : protéine, créatine, vitamines, « brûleurs »… ou « aucun »' },
    { id: 'complementsAttente', label: "Ce que tu attends de conseils en compléments", type: 'plusieurs', aucun: "Je n'en veux pas", autre: true,
      options: ["Je n'en veux pas", 'Compléter mon alimentation', 'Récupération après le sport', 'Énergie au quotidien', 'Savoir si les miens sont utiles'] },
    { id: 'complementsBudget', label: 'Budget compléments par mois', type: 'un', si: r => !vals(r, 'complementsAttente').includes("Je n'en veux pas"),
      options: ['Moins de 20 €', '20–40 €', '40–70 €', 'Plus de 70 €'] },
    { id: 'complementsForme', label: 'Formes que tu acceptes', type: 'plusieurs', facultatif: true, si: r => !vals(r, 'complementsAttente').includes("Je n'en veux pas"),
      options: ['Gélules', 'Comprimés', 'Poudre', 'Liquide', 'Sans gélatine animale'] },
    { id: 'trouble', label: 'Trouble alimentaire diagnostiqué ou suivi en cours', type: 'un', options: ['Non', 'Antérieur', 'Suivi en cours'] },
    { id: 'troubleNom', label: 'Lequel ?', type: 'texte', si: r => ['Antérieur', 'Suivi en cours'].includes(val(r, 'trouble')) },
  ]},
  { id: 'sommeil', icone: 'moon', titre: 'Sommeil et stress', nom: 'Sommeil et stress', sous: 'Ils pèsent lourd sur la faim et les résultats.', questions: [
    { id: 'heuresSommeil', label: 'Heures de sommeil par nuit, en vrai', type: 'un', options: ['< 6 h', '6–7', '7–8', '> 8 h', 'Chaotique'] },
    { id: 'qualiteSommeil', label: 'Qualité du sommeil', type: 'echelle', bas: 'Mauvaise', haut: 'Excellente' },
    { id: 'niveauStress', label: 'Stress ces 4 dernières semaines', type: 'echelle', bas: 'Zen', haut: 'Au max' },
    { id: 'sourcesStress', label: 'Sources de stress', type: 'plusieurs', autre: true, facultatif: true,
      options: ['Travail', 'Argent', 'Famille', 'Image du corps', 'Santé'] },
  ]},
  { id: 'bonus', icone: 'sparkles', titre: 'Bonus : 90 secondes', nom: 'Bonus', sous: 'Facultatif, mais ça rend ton plan encore plus juste.', facultative: true, questions: [
    { id: 'favoris', label: '3 aliments que tu veux voir souvent dans le plan', type: 'texte', facultatif: true },
    { id: 'petitDej', label: 'Petit-déjeuner typique (ou « je ne prends pas »)', type: 'long', facultatif: true },
    { id: 'diner', label: 'Dîner typique', type: 'long', facultatif: true },
  ]},
];

export const MISE_A_JOUR = [
  { id: 'bilan', icone: 'scale', titre: 'Ton bilan du mois', nom: 'Ton bilan', sous: 'Quelques minutes pour ajuster ton plan.', questions: [
    { id: 'poids', label: "Ton poids aujourd'hui", type: 'nombre', saisie: true, unite: 'kg', min: 35, max: 250 },
    { id: 'conditions', label: 'Cette pesée est', type: 'un', options: ["Mêmes conditions que d'habitude", 'Approximative'] },
    { id: 'observance', label: 'Observance réelle', type: 'un', options: ["J'ai suivi à peu près", 'La moitié', 'Peu'] },
    { id: 'ressenti', label: 'Faim / énergie / digestion ce mois-ci', type: 'un', options: ['Mieux', 'Pareil', 'Pire'] },
  ]},
  { id: 'suite', icone: 'route', titre: 'La suite', nom: 'La suite', sous: 'Ce qui marche, ce qui change.', questions: [
    { id: 'reussi', label: 'Ce qui a bien marché ce mois-ci', type: 'long' },
    { id: 'changer', label: 'Ce que tu veux changer', type: 'un', autre: true,
      options: ['Plus de variété', 'Moins de faim', 'Nouvel objectif', 'Horaires différents', 'Juste ajuster les quantités'] },
    { id: 'sportBouge', label: "L'entraînement a bougé ?", type: 'un', options: ['Non', 'Plus', 'Moins', 'Blessé', 'Nouveau sport'] },
    { id: 'complementsSuivis', label: 'Les conseils en compléments, tu les as suivis ?', type: 'un', options: ['Oui', 'En partie', 'Non', 'Pas concerné'] },
    { id: 'complementsGene', label: 'Une gêne ou une question sur un complément ?', type: 'texte', facultatif: true, si: r => ['Oui', 'En partie'].includes(val(r, 'complementsSuivis')) },
    { id: 'nouveau', label: 'Nouveau traitement, grossesse, blessure ?', type: 'un', options: ['Non', 'Oui'] },
    { id: 'nouveauPrecis', label: 'Précise en une ligne', type: 'texte', si: r => val(r, 'nouveau') === 'Oui' },
    { id: 'message', label: 'Message pour le prochain plan', type: 'long', facultatif: true },
  ]},
];

// Consentements K (sur le recapitulatif, avant l'envoi).
// Trois cases obligatoires, decochees ; bouton grise tant qu'une manque
// (Raci, 27/09). Societe = BELFIT, comme dans confidentialite.html.
// CGV et FAQ du coaching : page cgv.html (27/09, en relecture).
export const LIENS_LEGAUX = { confidentialite: '/confidentialite.html', cgv: '/cgv.html#cgv', faq: '/cgv.html#faq' };
export const CONSENTEMENTS = [
  { id: 'k1', requis: true, liens: [['Confidentialité', 'confidentialite']],
    texte: "J'accepte que mes informations, y compris de santé, soient utilisées par BELFIT et mon coach pour construire et m'envoyer mon plan." },
  { id: 'k2', requis: true,
    texte: "Je comprends que ce n'est pas un avis médical. Je dois signaler une pathologie, une grossesse ou un traitement." },
  { id: 'k3', requis: true, liens: [['CGV', 'cgv'], ['FAQ', 'faq']],
    texte: "Je demande à recevoir mon plan tout de suite. Une fois livré, je perds mon droit de rétractation de 14 jours. Remboursement : voir FAQ." },
];

/** Vrai si une reponse demande l'avis d'un medecin avant le plan. */
export function alerteSante(r) {
  return vals(r, 'suivi').some(x => x !== 'Aucun')
    || ['Antérieur', 'Suivi en cours'].includes(val(r, 'trouble'))
    || val(r, 'nouveau') === 'Oui';
}

/** Allergie avec reaction grave : aliment exclu a 100 %. */
export function allergieGrave(r) {
  return vals(r, 'reaction').some(x => /Gonflement|Malaises/.test(x));
}

/** Options visibles d'une question (filtre selon les reponses). */
export function optionsDe(q, r) {
  const base = (q.options || []).map(o => Array.isArray(o) ? o[0] : o);
  const f = q.filtre ? base.filter(o => q.filtre(o, r)) : base;
  return q.autre ? [...f, 'Autre'] : f;
}

/** Une question est-elle correctement remplie ? */
export function repondue(q, rep, toutesRep) {
  const r = rep || {};
  if (q.type === 'aliments') {
    const vs = r.valeurs || [];
    return (q.categories || []).every((c) => {
      const opts = optionsAliments(c, toutesRep || {});
      const min = Math.min(c.min || 0, opts.length);
      return opts.filter((o) => vs.includes(o)).length >= min;
    });
  }
  const vide = q.type === 'plusieurs' ? !(r.valeurs || []).length : r.valeur === undefined || r.valeur === null || String(r.valeur).trim() === '';
  if (q.facultatif && vide) return true;
  if (q.type === 'nombre') {
    const n = parseFloat(String(r.valeur ?? '').replace(',', '.'));
    return !isNaN(n) && n >= (q.min ?? -Infinity) && n <= (q.max ?? Infinity);
  }
  if (q.type === 'echelle') return +r.valeur >= 1 && +r.valeur <= 10;
  if (q.type === 'roulette') return r.valeur !== undefined && r.valeur !== '' && +r.valeur >= q.min && +r.valeur <= q.max;
  if (q.type === 'texte' || q.type === 'long' || q.type === 'date') return !vide;
  if (q.type === 'un' || q.type === 'tuiles') return !!r.valeur && (r.valeur !== 'Autre' || !q.autre || !!String(r.autre || '').trim());
  if (q.type === 'plusieurs') {
    const vs = r.valeurs || [];
    return vs.length > 0 && (!vs.includes('Autre') || !q.autre || !!String(r.autre || '').trim());
  }
  return true;
}

/** Texte lisible d'une reponse (recapitulatif, e-mail au coach). */
export function lisible(q, rep) {
  const r = rep || {};
  if (q.type === 'plusieurs') return (r.valeurs || []).map(x => x === 'Autre' ? (r.autre || 'Autre') : x).join(', ') || '—';
  if (q.type === 'aliments') {
    const vs = r.valeurs || [];
    const connus = new Set((q.categories || []).flatMap((c) => c.options));
    const parties = (q.categories || []).map((c) => {
      const pris = c.options.filter((o) => vs.includes(o));
      return pris.length ? c.nom + ' : ' + pris.join(', ') : '';
    }).filter(Boolean);
    const autres = vs.filter((x) => !connus.has(x));
    if (autres.length) parties.push('Autres : ' + autres.join(', '));
    return parties.join(' · ') || '—';
  }
  if (r.valeur === 'Autre') return r.autre || 'Autre';
  const v = String(r.valeur ?? '').trim();
  if (!v) return '—';
  if (q.type === 'nombre' && q.unite) return v + ' ' + q.unite;
  if (q.type === 'echelle') return v + ' / 10';
  return v;
}
