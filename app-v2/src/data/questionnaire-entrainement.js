// Questionnaire du COACHING ENTRAINEMENT (23/11, valide par Raci).
// Meme moteur que le questionnaire alimentation (QuestionnaireCoach, type
// 'entrainement'). Ouvert par le coach apres reception du virement (50 EUR) :
// aucune mention de paiement dans l'app (regle Google Play).
// 7 parties : Toi, Objectif, Experience, Disponibilites, Lieu et materiel,
// Sante, Preferences. Photos : pas encore (stockage prive a prevoir).

const val = (r, id) => (r[id] || {}).valeur;
const vals = (r, id) => (r[id] || {}).valeurs || [];
const oui = (id) => (r) => val(r, id) === 'Oui';

export const QUESTIONNAIRE_ENTRAINEMENT = [
  { id: 'toi', icone: 'user', nom: 'Toi', questions: [
    { id: 'age', label: 'Âge', type: 'nombre', saisie: true, unite: 'ans', min: 16, max: 90 },
    { id: 'sexe', label: 'Sexe', type: 'tuiles', options: [['Femme', 'gender-female'], ['Homme', 'gender-male']] },
    { id: 'taille', label: 'Taille', type: 'nombre', saisie: true, unite: 'cm', min: 130, max: 230 },
    { id: 'poids', label: 'Poids actuel', type: 'nombre', saisie: true, unite: 'kg', min: 35, max: 250 },
    { id: 'travail', label: 'Ton travail, au quotidien', type: 'un', options: ['Assis', 'Debout', 'Physique'] },
    { id: 'horaires', label: 'Tes horaires de travail', type: 'un', options: ['Journée classique', 'Travail de nuit', 'Horaires décalés'] },
    { id: 'stress', label: 'Ton stress ces 4 dernières semaines', type: 'echelle' },
  ]},
  { id: 'objectif', icone: 'target', nom: 'Ton objectif', questions: [
    { id: 'objectif', label: 'Ton objectif principal', type: 'tuiles',
      options: [['Prendre du muscle', 'barbell'], ['Perdre du gras', 'flame'], ['Recomposition', 'arrows-exchange'], ['Force', 'trophy'], ['Remise en forme', 'bolt']] },
    { id: 'echeance', label: 'Tu as une échéance ?', type: 'un', options: ['Pas de date', 'Dans 3 mois', 'Dans 6 mois', 'Date précise'] },
    { id: 'echeanceDate', label: 'Quelle date ?', type: 'date', si: (r) => val(r, 'echeance') === 'Date précise' },
    { id: 'debut', label: 'Quand veux-tu commencer ?', type: 'date' },
  ]},
  { id: 'experience', icone: 'list-check', nom: 'Ton expérience', questions: [
    { id: 'anciennete', label: 'Depuis combien de temps t\'entraînes-tu sans interruption ?', type: 'un',
      options: ['Moins de 6 mois', '6 mois à 1 an', '1 à 3 ans', 'Plus de 3 ans'] },
    { id: 'programmeActuel', label: 'Ton programme actuel (jours, exercices, séries)', type: 'long', facultatif: true },
    { id: 'charges', label: 'Tes charges sur les mouvements de base (ex. développé couché 70 kg × 8, squat ou presse, soulevé de terre, tirage, développé épaules)', type: 'long', facultatif: true },
    { id: 'echec', label: 'Tu vas jusqu\'à l\'échec (plus aucune répétition possible) ?', type: 'un', options: ['Jamais', 'Parfois', 'À chaque série'] },
  ]},
  { id: 'dispo', icone: 'clock', nom: 'Tes disponibilités', questions: [
    // Les jours cochés donnent le nombre de séances (plus de « 4 jours » avec un seul jour coché).
    { id: 'jours', label: 'Quels jours peux-tu t\'entraîner ?', type: 'plusieurs', options: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] },
    { id: 'duree', label: 'Durée maximum d\'une séance', type: 'un', options: ['45 min', '1 h', '1 h 15', '1 h 30', 'Plus'] },
    { id: 'moment', label: 'À quel moment ?', type: 'un', options: ['Matin', 'Midi', 'Soir', 'Variable'] },
  ]},
  { id: 'lieu', icone: 'barbell', nom: 'Lieu et matériel', questions: [
    { id: 'lieu', label: 'Où t\'entraînes-tu ?', type: 'un', options: ['Salle complète', 'Salle basique', 'Maison'] },
    { id: 'materiel', label: 'Matériel disponible', type: 'plusieurs',
      options: ['Barre libre', 'Machine Smith', 'Haltères', 'Poulies', 'Presse à cuisses', 'Hack squat', 'Machines guidées', 'Banc réglable', 'Élastiques'] },
    { id: 'halteresMax', label: 'Haltères jusqu\'à combien de kg ?', type: 'nombre', saisie: true, unite: 'kg', min: 1, max: 100,
      facultatif: true, si: (r) => vals(r, 'materiel').includes('Haltères') },
  ]},
  { id: 'sante', icone: 'heart-rate-monitor', nom: 'Ta santé', questions: [
    { id: 'blessure', label: 'Une blessure ou une douleur en ce moment, ou qui revient ?', type: 'un', options: ['Non', 'Oui'] },
    { id: 'blessureOu', label: 'Où ?', type: 'texte', si: oui('blessure') },
    { id: 'blessureDetail', label: 'Depuis quand, et qu\'est-ce qui fait mal ?', type: 'long', si: oui('blessure') },
    { id: 'interdits', label: 'Des mouvements interdits par un médecin ou un kiné ?', type: 'un', options: ['Non', 'Oui'] },
    { id: 'interditsDetail', label: 'Lesquels ?', type: 'texte', si: oui('interdits') },
    { id: 'contre', label: 'Une contre-indication à l\'effort intense (cœur, tension, grossesse, opération récente…) ?', type: 'un', options: ['Non', 'Oui'] },
    { id: 'contreDetail', label: 'Laquelle ?', type: 'texte', si: oui('contre') },
  ]},
  { id: 'pref', icone: 'sparkles', nom: 'Préférences', questions: [
    { id: 'priorites', label: 'Muscles à prioriser', type: 'plusieurs',
      options: ['Pectoraux', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Fessiers', 'Abdos', 'Aucune préférence'], aucun: 'Aucune préférence' },
    { id: 'split', label: 'Organisation des séances préférée', type: 'un', options: ['Full body', 'Haut / Bas', 'Push Pull Legs', 'Au choix du coach'] },
    { id: 'aime', label: 'Exercices que tu aimes', type: 'texte', facultatif: true },
    { id: 'refuse', label: 'Exercices que tu ne veux pas faire', type: 'texte', facultatif: true },
    { id: 'cardio', label: 'Cardio actuel', type: 'un', options: ['Aucun', '1 à 2 fois par semaine', '3 à 4 fois par semaine', '5 fois ou plus'] },
    { id: 'cardioType', label: 'Quel cardio, et combien de temps ?', type: 'texte', facultatif: true, si: (r) => val(r, 'cardio') && val(r, 'cardio') !== 'Aucun' },
    { id: 'sommeil', label: 'Heures de sommeil par nuit', type: 'un', options: ['Moins de 6 h', '6 à 7 h', '7 à 8 h', 'Plus de 8 h'] },
    { id: 'remarque', label: 'Une remarque pour ton coach', type: 'long', facultatif: true },
  ]},
];

export const CONSENTEMENTS_ENTRAINEMENT = [
  { id: 'e1', requis: true, liens: [['Confidentialité', 'confidentialite']],
    texte: "J'accepte que mes réponses, y compris de santé, soient utilisées par BELFIT et mon coach pour construire mon programme." },
  { id: 'e2', requis: true,
    texte: "Je comprends que ce n'est pas un avis médical. Je signale toute douleur, blessure ou contre-indication, et j'arrête un exercice qui fait mal." },
  { id: 'e3', requis: true, liens: [['CGV', 'cgv']],
    texte: "Je demande à recevoir mon programme tout de suite. Une fois livré, je perds mon droit de rétractation de 14 jours." },
];

/** Un point de sante a voir avant de programmer (badge chez le coach + conseil au client). */
export function alerteSanteEntrainement(r) {
  return val(r, 'blessure') === 'Oui' || val(r, 'interdits') === 'Oui' || val(r, 'contre') === 'Oui';
}
