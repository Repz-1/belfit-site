import { effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { langue } from '../i18n/index.js';

// ============================================================
// LANGUE DU CLIENT SUR SON COMPTE — 20/11.
// L'e-mail « Ton plan coach est arrive » part du serveur, au moment ou
// le coach envoie le plan : il ne peut pas lire l'appareil du client.
// La langue de l'app est donc recopiee dans v2Data.langue (fr|en|nl) ;
// le serveur la lit (functions/index.js, deposerChez). Ecrite seulement
// quand elle change, apres la lecture du compte.
// ============================================================

let uidPret = null;
let derniere = null;

effect(() => {
  const u = identite.value;
  const l = langue.value;
  if (!u) { uidPret = null; derniere = null; return; }
  if (uidPret !== u) {
    chargerDonnees(u).then((d) => {
      if (identite.peek() !== u) return;
      uidPret = u;
      derniere = d && d.langue;
      if (derniere !== langue.peek()) { derniere = langue.peek(); sauvegarder(u, { langue: derniere }); }
    }).catch(() => { /* hors ligne : on reessaiera au prochain changement */ });
    return;
  }
  if (l !== derniere) { derniere = l; sauvegarder(u, { langue: l }); }
});
