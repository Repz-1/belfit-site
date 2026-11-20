import { langue } from './index.js';
import { NOMS_EXOS } from '../data/exercices-noms.js';

/** Nom d'exercice dans la langue de l'app (affichage seulement : le nom
 *  francais reste la cle enregistree). Un nom inconnu reste tel quel. */
export function nomExo(nom) {
  const l = langue.value;
  if (l !== 'en' && l !== 'nl') return nom;
  const e = NOMS_EXOS[nom];
  return e ? e[l === 'en' ? 0 : 1] : nom;
}
