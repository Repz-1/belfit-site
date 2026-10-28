import { auth } from './firebase.js';

export const COACH_API =
  'https://europe-west1-repz-baf60.cloudfunctions.net/coachAgent';

/**
 * Demande au coach de comprendre un message.
 * Ne touche pas au journal : l'appelant affiche, puis confirme.
 */
export async function demanderCoach(message, contexte) {
  const user = auth.currentUser;
  if (!user) {
    const e = new Error('no_auth');
    e.code = 'no_auth';
    throw e;
  }
  const token = await user.getIdToken();
  const rep = await fetch(COACH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({ message, contexte }),
  });
  if (rep.status === 401) {
    const e = new Error('no_auth');
    e.code = 'no_auth';
    throw e;
  }
  if (rep.status === 403) {
    // 403 « acces_nutrition » : alimentation fermee (blocage), distinct de « not_premium ».
    let corps = null;
    try { corps = await rep.json(); } catch (x) { /* corps illisible */ }
    const fermee = !!corps && corps.error === 'acces_nutrition';
    const e = new Error(fermee ? 'acces_nutrition' : 'not_premium');
    e.code = fermee ? 'acces_nutrition' : 'not_premium';
    throw e;
  }
  if (rep.status === 404) {
    const e = new Error('not_deployed');
    e.code = 'not_deployed';
    throw e;
  }
  if (!rep.ok) {
    const e = new Error('coach_failed');
    e.code = 'coach_failed';
    e.status = rep.status;
    throw e;
  }
  return rep.json();
}
