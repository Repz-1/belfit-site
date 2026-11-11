// ============================================================
// MISE A JOUR DE L'APP (11/11, Raci : « je suis a la 680 », alors que
// la 684 etait en ligne — deuxieme fois en quatre jours).
//
// L'app ne savait pas qu'une version plus recente existait : un
// telephone qui garde la page en memoire, ou un ancien service worker
// qui sert son HTML en cache, restait indefiniment sur l'ancienne.
//
// Ici l'app le VERIFIE elle-meme : /v2/version.json est ecrit a chaque
// build (vite.config.js). Au lancement, une version plus recente est
// prise tout de suite, en silence. En cours d'usage (retour sur l'app),
// on ne recharge jamais sous les doigts : un bandeau le propose.
// ============================================================
import { signal } from '@preact/signals';
import { VERSION_APP } from '../version.js';

export const majDisponible = signal(0);

const CLE = 'belfit_maj_tentee';
const PAUSE = 5 * 60000;
let dernier = 0;

async function versionEnLigne() {
  try {
    // Adresse unique a chaque appel : ni le cache HTTP ni un ancien
    // service worker (cache d'abord sur /v2/*) ne peuvent repondre.
    const r = await fetch('/v2/version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return 0;
    const d = await r.json();
    return Number(d && d.v) || 0;
  } catch (e) { return 0; }
}

export async function appliquerMiseAJour(v) {
  try { sessionStorage.setItem(CLE, String(v)); } catch (e) {}
  try {
    if (window.caches) {
      const cles = await caches.keys();
      // Les photos d'exercices (belfit-photos-*) restent.
      await Promise.all(cles.filter(c => c.indexOf('belfit-v2-') === 0).map(c => caches.delete(c)));
    }
    if (navigator.serviceWorker) {
      const reg = await navigator.serviceWorker.getRegistration('/v2/');
      if (reg) await reg.update().catch(() => {});
    }
  } catch (e) {}
  // Adresse inedite : le HTML ne peut pas sortir d'un cache. Les autres
  // parametres (lien offert, invitation) sont conserves.
  const u = new URL(location.href);
  u.searchParams.set('maj', String(v));
  location.replace(u.toString());
}

export function surveillerMiseAJour() {
  if (!import.meta.env.PROD) return;
  // Le parametre a fait son travail : on le retire de la barre d'adresse.
  try {
    const u = new URL(location.href);
    if (u.searchParams.has('maj')) { u.searchParams.delete('maj'); history.replaceState(null, '', u.toString()); }
  } catch (e) {}
  const verifier = async (auLancement) => {
    const maintenant = Date.now();
    if (maintenant - dernier < PAUSE) return;
    dernier = maintenant;
    const v = await versionEnLigne();
    if (v <= VERSION_APP) return;
    let tentee = 0;
    try { tentee = Number(sessionStorage.getItem(CLE)) || 0; } catch (e) {}
    // Une seule tentative automatique par version : si elle n'a pas
    // suffi, on ne boucle pas, on propose le bandeau.
    if (auLancement && tentee < v) { appliquerMiseAJour(v); return; }
    majDisponible.value = v;
  };
  verifier(true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') verifier(false);
  });
}
