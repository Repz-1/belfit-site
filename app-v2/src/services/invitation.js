// Invitation par lien (02/10, plan offert en plus) : belfit.be/?invitation=CODE.
// Le code est garde de cote (il survit a la creation du compte, au
// retour de Google et au rechargement), puis consomme des que la
// personne est connectee. Le parametre n'est pas celui du retour Mollie
// (coach=questionnaire), qui est lu plus tard et ne doit pas l'effacer.
import { effect, signal } from '@preact/signals';
import { utilisateur, adresseConfirmee } from './firebase.js';
import { chargerProgramme } from '../components/BelfitPlus.jsx';
import { lireInvitationUrl, suiteInvitation } from './invitation-reponse.js';

const CLE = 'belfit_invitation';
const CLE_SILENCE = 'belfit_invitation_silence';
const CLE_VERIF = 'belfit_invitation_verif';
const URL_FN = 'https://europe-west1-repz-baf60.cloudfunctions.net/utiliserInvitation';

try {
  const lu = lireInvitationUrl(location.search);
  if (lu.code) {
    localStorage.setItem(CLE, lu.code);
    try { localStorage.removeItem(CLE_SILENCE); } catch (e) { /* rien */ }
    history.replaceState(null, '', location.pathname + (lu.search ? '?' + lu.search : '') + location.hash);
  }
} catch (e) { /* stockage indisponible */ }

let enCours = false;
const reprise = signal(0);
effect(() => {
  reprise.value;
  const confirmee = adresseConfirmee.value;
  const u = utilisateur.value;
  if (!u || u.isAnonymous || enCours) return;
  let code = null;
  try { code = localStorage.getItem(CLE); } catch (e) {}
  if (!code) return;
  let silence = null;
  try { silence = localStorage.getItem(CLE_SILENCE); } catch (e) {}
  if (silence === u.uid) return;
  enCours = true;
  (async () => {
    let retenter = false;
    try {
      // 08/11 : toujours un jeton neuf, sinon une adresse deja confirmee
      // ailleurs est encore vue comme non confirmee.
      void confirmee;
      const token = await u.getIdToken(true);
      const r = await fetch(URL_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ code }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        try { localStorage.removeItem(CLE); localStorage.removeItem(CLE_SILENCE); sessionStorage.removeItem(CLE_VERIF); } catch (e) {}
        chargerProgramme();
      } else {
        const suite = suiteInvitation(d.motif);
        if (!suite.garder) {
          try { localStorage.removeItem(CLE); } catch (e) {}
        }
        if (suite.silence) {
          try { localStorage.setItem(CLE_SILENCE, u.uid); } catch (e) {}
        }
        let deja = false;
        try {
          if (d.motif === 'verification') {
            deja = sessionStorage.getItem(CLE_VERIF) === '1';
            sessionStorage.setItem(CLE_VERIF, '1');
          } else sessionStorage.removeItem(CLE_VERIF);
        } catch (e) {}
        if (suite.message && !deja) alert(suite.message);
        retenter = d.motif === 'verification' && adresseConfirmee.value && !deja;
      }
    } catch (e) { /* reseau : nouvel essai plus tard */ }
    enCours = false;
    if (retenter) reprise.value += 1;
  })();
});
