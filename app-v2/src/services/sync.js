import { auth } from './firebase.js';
import { initializeApp, getApps } from 'firebase/app';
import { effect } from '@preact/signals';
import { lectureSeule, cloudNutritionPermis, sansNutrition } from '../store/acces-nutrition.js';
import { ecritureAutorisee } from './sync-garde.js';

/* Firestore pese 170 Ko gzip : importe en statique ici, il entrait
   dans le graphe de demarrage via Courses/Scanner/SeanceTracker et
   retardait le premier affichage de toute l'app. On le charge donc
   a la premiere lecture/ecriture cloud — le local-first ne l'attend
   jamais : localStorage repond d'abord dans tous les cas. */
let _fsPromesse = null;
function firestore() {
  if (!_fsPromesse) {
    _fsPromesse = import('firebase/firestore').then((fs) => {
      const db = fs.getFirestore(getApps()[0]);
      // Cache hors-ligne natif ; echec silencieux possible (multi-onglets)
      // Si un autre module (BelfitPlus, firebase.js...) a deja demarre
      // Firestore, cet appel LEVE une erreur synchrone (failed-precondition)
      // au lieu de rejeter : sans ce try, toute la promesse echouait et la
      // session entiere tombait en « hors-ligne » (lecture locale vide,
      // aucune ecriture cloud) — origine des repas effaces.
      try { fs.enableIndexedDbPersistence(db).catch(() => {}); } catch (e) {}
      return { fs, db };
    });
    // Un echec (chargement du module) ne doit pas rester en cache a vie
    _fsPromesse.catch(() => { _fsPromesse = null; });
  }
  return _fsPromesse;
}

// ============================================================
// SYNC v2 — local-first.
// - Ecriture : localStorage immediat, puis Firestore en arriere-plan
//   (debounce 2s pour grouper les frappes rapides).
// - Lecture : Firestore au demarrage, fallback local si hors-ligne.
// - Conflits : le plus recent gagne (champ ts).
// - Les donnees v2 vivent dans users/{uid}.v2Data (champ dedie :
//   n'ecrase JAMAIS les donnees du site actuel appData/premium/etc).
// ============================================================

let timerEnvoi = null;
// Etat complet en memoire : les differents stores (journal, entrainement...)
// sauvegardent chacun LEURS champs ; on fusionne ici pour ne jamais
// ecraser les champs des autres.
let etatComplet = {};
// A quel compte appartient `etatComplet`. Au changement de compte il
// faut repartir de zero : sans ca, les donnees du precedent seraient
// reecrites dans le document du suivant.
let uidEtat = null;
// Lecture cloud partagee : tous les stores (journal, stats, seances...)
// attendent LA MEME lecture au demarrage. Avant, chacun lisait de son
// cote ; une sauvegarde precoce d'un store reecrivait le localStorage
// avec un ts neuf mais des champs partiels, et la lecture suivante
// preferait cette copie « plus recente » a la vraie copie cloud : les
// repas/l'eau repartaient vides puis etaient renvoyes au cloud.
let lecture = null; // { uid, promesse }
// Vrai quand la copie cloud de uidEtat a ete lue avec succes : tant que
// ce n'est pas le cas, rien n'est ecrit (ni local, ni cloud).
let cloudLu = false;
let envoiEnAttente = false;

function cleLocale(uid) {
  return `belfit_v2_journal_${uid}`;
}

// L'invite n'a pas de compte : pas de cloud, uniquement le local
const UID_INVITE = '__invite__';

// ---- Lecture au demarrage : cloud d'abord, local en secours ----
export function chargerDonnees(uid) {
  if (uid !== uidEtat) { etatComplet = {}; uidEtat = uid; cloudLu = false; envoiEnAttente = false; lecture = null; }
  if (!lecture || lecture.uid !== uid) {
    const promesse = lireUneFois(uid);
    lecture = { uid, promesse };
  }
  // Copie par appelant : un store ne doit pas modifier l'objet d'un autre
  return lecture.promesse.then(d => (d ? structuredClone(d) : d));
}

// Un getDoc lance juste apres la connexion peut rester sans reponse
// (jeton pas encore pret, cache IndexedDB en cours d'ouverture). Comme
// tous les stores partagent cette lecture, on ne la laisse jamais pendre :
// delai de 8 s puis nouvel essai direct au serveur, jusqu'a 5 fois.
async function lireDocAvecRelance(fs, db, uid) {
  let derniere;
  for (let essai = 0; essai < 5; essai++) {
    const ref = fs.doc(db, 'users', uid);
    const lire = essai === 0 ? fs.getDoc(ref) : fs.getDocFromServer(ref);
    try {
      return await Promise.race([
        lire,
        new Promise((_, rej) => setTimeout(() => rej(new Error('delai')), 8000)),
      ]);
    } catch (e) {
      derniere = e;
      if (e && e.code === 'permission-denied' && essai >= 2) break;
      await new Promise(r => setTimeout(r, 1000 * (essai + 1)));
    }
  }
  throw derniere;
}

async function lireUneFois(uid) {
  const localBrut = localStorage.getItem(cleLocale(uid));
  // Une entree localStorage corrompue (quota atteint en pleine
  // ecriture, extension navigateur) ne doit pas bloquer le demarrage :
  // on repart du cloud plutot que de planter au premier ecran.
  let local = null;
  if (localBrut) {
    try { local = JSON.parse(localBrut); }
    catch { local = null; }
  }
  if (uid === UID_INVITE) { etatComplet = { ...(local || {}), ...etatComplet }; cloudLu = true; return local; }
  try {
    const { fs, db } = await firestore();
    const snap = await lireDocAvecRelance(fs, db, uid);
    const brut = snap.exists() ? snap.data() : null;
    const cloud = brut && brut.v2Data ? brut.v2Data : null;
    if (cloud && !cloud.prenom && brut.prenom) cloud.prenom = brut.prenom;
    let resultat;
    if (cloud && local) {
      // Conflit : le plus recent gagne
      resultat = (cloud.ts || 0) >= (local.ts || 0) ? cloud : local;
    } else {
      resultat = cloud || local || null;
    }
    // Aucune donnee v2 : premier passage d'un utilisateur v1 -> on convertit
    // ses donnees existantes (lecture seule sur v1, rien n'est efface).
    if (!resultat) {
      const { migrerSiNecessaire } = await import('./migration.js');
      const migre = await migrerSiNecessaire(uid);
      if (migre) {
        resultat = migre;
        try { localStorage.setItem(cleLocale(uid), JSON.stringify(migre)); } catch (e) {}
        fs.setDoc(fs.doc(db, 'users', uid), { v2Data: migre }, { merge: true }).catch(() => {});
      }
    }
    if (uid !== uidEtat) return resultat; // changement de compte entre-temps
    etatComplet = { ...(resultat || {}), ...etatComplet };
    cloudLu = true;
    if (envoiEnAttente) { envoiEnAttente = false; sauvegarder(uid, {}); }
    return resultat;
  } catch (e) {
    // Hors-ligne ou erreur reseau -> copie locale. On ne marque PAS le
    // cloud comme lu : aucune ecriture ne partira tant qu'une vraie
    // lecture n'aura pas reussi (prochain chargerDonnees = nouvel essai).
    if (uid === uidEtat) { etatComplet = { ...(local || {}), ...etatComplet }; lecture = null; }
    return local || null;
  }
}

// ---- Ecriture : local immediat + cloud differe ----
export function sauvegarder(uid, champsPartiels) {
  // Fusion : chaque store n'ecrit que ses champs, sans toucher aux autres
  etatComplet = { ...etatComplet, ...champsPartiels };
  // Pas encore de lecture cloud reussie pour ce compte : on garde le
  // changement en memoire et on l'ecrira juste apres la lecture. Ecrire
  // maintenant ecraserait la vraie copie par un etat incomplet.
  if (!ecritureAutorisee(uid, uidEtat, cloudLu)) { if (uid === uidEtat) envoiEnAttente = true; return; }
  const instantane = { ...etatComplet, ts: Date.now() };
  try { localStorage.setItem(cleLocale(uid), JSON.stringify(instantane)); } catch (e) {}
  if (uid === UID_INVITE) return; // pas de cloud pour un invite
  // Debounce : on n'envoie au cloud qu'apres 2s de calme (groupe les frappes)
  clearTimeout(timerEnvoi);
  timerEnvoi = setTimeout(() => {
    // BLOCAGE ALIMENTATION : sans acces actif, les cles nutrition ne partent
    // PAS au cloud. Une seule cle refusee par les regles ferait echouer toute
    // l'ecriture groupee (seances et poids compris). Les donnees locales
    // restent intactes ; elles repartent des que l'acces s'ouvre (plus bas).
    // Evalue a l'envoi, pas a l'appel : l'acces peut etre connu entre-temps.
    const complet = cloudNutritionPermis();
    const envoi = complet ? instantane : sansNutrition(instantane);
    firestore().then(({ fs, db }) =>
      fs.setDoc(fs.doc(db, 'users', uid), { v2Data: envoi }, { merge: true })
        .catch((err) => {
          // Regles serveur plus strictes que l'etat connu du client (acces
          // expire entre deux lectures) : on renvoie sans la nutrition pour
          // ne pas perdre les seances et le poids. Une seule tentative.
          if (complet && err && err.code === 'permission-denied') {
            return fs.setDoc(fs.doc(db, 'users', uid), { v2Data: sansNutrition(instantane) }, { merge: true });
          }
          throw err;
        })
    ).catch(() => {/* hors-ligne : Firestore rejouera a la reconnexion */});
  }, 2000);
}

// Quand l'acces nutrition s'ouvre (paiement, code, offre), on envoie ce qui
// avait ete retenu. L'effet ne reagit qu'aux CHANGEMENTS de lectureSeule :
// sans blocage, il ne se declenche jamais.
effect(() => {
  const ferme = lectureSeule.value;
  if (!ferme && uidEtat && uidEtat !== UID_INVITE) sauvegarder(uidEtat, {});
});
