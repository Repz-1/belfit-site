import { useState, useEffect } from 'preact/hooks';
import { useRetour } from '../services/retour.js';
import { signal, effect, computed } from '@preact/signals';
import { Icone } from './IconesCoach.jsx';
import { getApps } from 'firebase/app';
import { utilisateur } from '../services/firebase.js';
import { setObjectifs, objectifs, repas, cleDuNom, semerPlan, dateJour, donneesPretes, clotures } from '../store/journal.js';
import { macrosOf, DB } from '../data/aliments.js';
import { ongletActif, allerOnglet } from './BottomNav.jsx';
import { statsAvOuvertes } from './StatsAvancees.jsx';
import { ideesOuvertes, origineIdees } from './IdeesRepas.jsx';
import { origineCourses } from './Courses.jsx';
import { Entete } from './Entete.jsx';
import { dateBruxelles, resoudreProgramme } from '../store/plans-par-date.js';
import '../styles/belfit-plus.css';

const URL_AJUSTEMENT =
  'https://europe-west1-repz-baf60.cloudfunctions.net/demanderAjustement';

// ============================================================
// BELFIT+ — l'espace des membres.
//
// Ce n'est pas la page Premium avec un bandeau « merci ». Une page
// de vente lue par quelqu'un qui a deja paye ne lui apprend rien :
// elle lui redit ce qu'il obtiendrait, au futur, avec une colonne
// GRATUIT qui ne le concerne plus.
//
// Ici, les quatre cartes reprennent exactement les quatre benefices
// vendus sur la page Premium — ce qui a ete promis est livre au
// meme endroit, dans le meme ordre. Chacune porte une donnee reelle
// plutot qu'une description : on n'explique plus ce que la fonction
// fera, on montre ou elle en est.
// ============================================================

// Programme depose par le coach dans users/{uid}.programme.
// Forme attendue :
//   { kcal, prot, carbs, lip, note, livreLe (ISO), version }
/** Page « Mon programme » ouverte. Un signal et non un useState : la
 *  personne part sur le calculateur, qui vit dans l'onglet Journal ;
 *  un etat local serait perdu au changement d'onglet et elle
 *  reviendrait sur l'accueil BelFit+ au lieu de sa page. */
export const progOuvert = signal(false);
/** D'ou le calculateur a-t-il ete ouvert : null | 'programme'. Sert a
 *  savoir ou revenir, et quel libelle mettre sur la fleche. */
export const origineCalc = signal(null);
// 26/10 Plans par date : `programmeBrut` est le document tel que le serveur
// le renvoie (users/{uid}.programme) ; `programme` est ce qu'il faut MONTRER
// aujourd'hui (jour de Bruxelles). Sans versions, c'est le meme objet qu'avant.
// Regles : store/plans-par-date.js.
export const programmeBrut = signal(null);
/** Jour calendaire a Bruxelles, remis a jour toutes les 30 s et au retour
 *  sur l'appli (une appli ouverte a minuit change de version seule). */
export const jourBruxelles = signal(dateBruxelles());
function majJourBruxelles() {
  const j = dateBruxelles();
  if (j && j !== jourBruxelles.peek()) jourBruxelles.value = j;
}
if (typeof document !== 'undefined') {
  setInterval(majJourBruxelles, 30000);
  document.addEventListener('visibilitychange', majJourBruxelles);
}
const programmeResolu = computed(() => resoudreProgramme(programmeBrut.value, jourBruxelles.value));
// `programme` garde l'allure d'un signal (lecture ET ecriture de .value) pour
// tout le code et les bancs d'essai existants : lire donne le plan resolu
// pour aujourd'hui (Bruxelles), ecrire remplace le plan brut recu.
export const programme = {
  get value() { return programmeResolu.value; },
  set value(v) { programmeBrut.value = v; },
  peek() { return programmeResolu.peek(); },
  subscribe(f) { return programmeResolu.subscribe(f); },
};
export const programmeCharge = signal(false);
// Dossier coaching (26/09) : dernier questionnaire envoye et derniere
// commande payee. La commande est ecrite par le webhook LemonSqueezy.
export const dossierCoach = signal({ questionnaire: null, commande: null });
/** Ajustements restants ce mois-ci, et quota de la formule. */
export const ajustements = signal({restants: null, quota: null});

export const DELAI_RELECTURE_MS = 60000;
let derniereLecture = 0;
let relectureEnCours = false;
/** Lecture de users/{uid} (Firestore en differe). Remplacable pour les bancs d'essai. */
const lireDocUtilisateur = (uid) =>
  import('firebase/firestore').then(({ getFirestore, doc, getDoc }) =>
    getDoc(doc(getFirestore(getApps()[0]), 'users', uid)))
    .then(s => (s.exists() ? s.data() : null));
let lecteurProgramme = lireDocUtilisateur;
/** Banc d'essai uniquement : remplace la lecture Firestore (sans argument : la remet). */
export function poserLecteurProgramme(f) { lecteurProgramme = f || lireDocUtilisateur; }
// (etat de la relecture : voir plus bas, « Relecture automatique du plan »)
// Compte pour lequel le dossier a ete charge (27/09) : au changement de
// compte sur le meme appareil, tout ce qui appartenait au precedent
// (plan, questionnaire, commande) est oublie puis recharge.
// Charge aussi le dossier des l'ouverture de l'app (27/09) : le plan
// fixe les objectifs du journal, il doit etre connu hors de l'onglet Coach.
let chargePour = null;
effect(() => {
  const u = utilisateur.value;
  const uid = u ? u.uid : null;
  if (programmeCharge.peek() && chargePour === uid) return;
  if (chargePour === uid && uid) return; // chargement deja en cours
  if (programmeCharge.peek()) {
    programmeBrut.value = null;
    dossierCoach.value = { questionnaire: null, commande: null };
    ajustements.value = { restants: null, quota: null };
    programmeCharge.value = false;
  }
  if (uid) chargerProgramme();
});

/** Un plan coach est actif : ses totaux SONT les objectifs du journal,
 *  et le client ne peut plus les modifier lui-meme (Raci, 27/09). */
export const planCoachActif = computed(() => !!(programme.value && +programme.value.kcal > 0));
effect(() => {
  const pr = programme.value;
  const o = objectifs.value;
  if (!pr || !(+pr.kcal > 0)) return;
  if (o.kcal === pr.kcal && o.prot === pr.prot && o.carbs === pr.carbs && o.lip === pr.lip) return;
  setObjectifs({ kcal: pr.kcal, prot: pr.prot, carbs: pr.carbs, lip: pr.lip });
});

// 22/10 Raci : des que le plan est connu (charge a l'ouverture de l'app,
// voir plus haut), ses repas arrivent seuls sur Aujourd'hui en « Prévu ».
// Une fois par journee du journal (dateJour, qui change a la cloture) et
// par livraison (livreLe) ; semerPlan n'ecrase jamais une saisie.
// Apres une cloture de la journee (clotures, journal.js), le seed rejoue meme
// si dateJour est inchange (cloture le soir meme) : les repas du plan
// reviennent en « Prevu » sur le journal vide.
const CLE_SEME = 'belfit_v2_plan_seme';
let cloturesSemees = 0;
effect(() => {
  const pr = programme.value;
  if (!pr || !Array.isArray(pr.repas) || !pr.repas.length) return;
  if (!donneesPretes.value) return;   // journal du compte pas encore charge
  const u = utilisateur.peek();
  const cle = CLE_SEME + '_' + (u ? u.uid : 'local');
  // 26/10 : une nouvelle version du plan (plans par date) rejoue le semis ;
  // sans versions, versionCle est absent et le marqueur reste celui d'avant.
  const marque = dateJour.value + '|' + String(pr.livreLe || '') + (pr.versionCle ? '|' + pr.versionCle : '');
  const nClotures = clotures.value;
  const apresCloture = nClotures !== cloturesSemees;
  try { if (!apresCloture && localStorage.getItem(cle) === marque) return; } catch (e) {}
  cloturesSemees = nClotures;
  semerPlan(pr.repas);
  try { localStorage.setItem(cle, marque); } catch (e) {}
});

export function chargerProgramme() {
  chargePour = utilisateur.peek() ? utilisateur.peek().uid : null;
  // Apercu local : le meme drapeau que l'apercu Premium sert a poser
  // un programme de demonstration sans passer par Firestore.
  try {
    const faux = localStorage.getItem('belfit_v2_apercu_programme');
    const dos = localStorage.getItem('belfit_v2_apercu_dossier');
    if (faux || dos) {
      programmeBrut.value = faux ? JSON.parse(faux) : null;
      if (dos) dossierCoach.value = JSON.parse(dos);
      const q = localStorage.getItem('belfit_v2_apercu_ajust');
      ajustements.value = q ? JSON.parse(q) : {restants: null, quota: null};
      programmeCharge.value = true;
      return;
    }
  } catch (e) { /* stockage indisponible : on suit le chemin normal */ }

  const u = utilisateur.value;
  if (!u || !getApps().length) { programmeCharge.value = true; return; }
  derniereLecture = Date.now();
  lecteurProgramme(u.uid)
    .then(d => {
      programmeBrut.value = (d && d.programme) || null;
      dossierCoach.value = { questionnaire: (d && d.questionnaireCoach) || null, commande: (d && d.commandeCoach) || null, brouillon: (d && d.brouillonCoach) || null, accesPro: (d && d.accesPro) || null };
      // 21/10 Raci : ajustements illimites pendant le mois de coaching,
      // plus de compteur affiche.
      ajustements.value = {restants: null, quota: null};
    })
    .catch(() => { programmeBrut.value = null; })
    .finally(() => { programmeCharge.value = true; });
}

// 27/10 Relecture automatique du plan. Avant : le plan n'etait lu qu'une
// fois, au demarrage ; un plan envoye par le coach pendant que l'appli
// restait ouverte n'apparaissait qu'apres deconnexion/reconnexion.
// Maintenant : au retour sur l'appli (visibilitychange / focus / pageshow),
// si un compte est connecte et que la derniere lecture date de plus de 60 s,
// on relit users/{uid} SANS rien remettre a zero :
//  - echec reseau : on garde le plan deja charge, rien ne change ;
//  - contenu identique : on ne touche pas aux signaux (memes objets), donc
//    aucun effet ne se rejoue et rien ne clignote ;
//  - programmeCharge reste a true pendant toute la relecture.
const memeContenu = (a, b) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; } };

/** Relecture silencieuse du plan. Rend true si une lecture a ete lancee. */
export function relireProgramme() {
  const u = utilisateur.peek();
  if (!u || !u.uid) return false;
  if (!programmeCharge.peek() || chargePour !== u.uid) return false;   // chargement initial pas fini, ou autre compte
  if (relectureEnCours || !getApps().length) return false;
  try { if (localStorage.getItem('belfit_v2_apercu_programme') || localStorage.getItem('belfit_v2_apercu_dossier')) return false; } catch (e) {}
  if (Date.now() - derniereLecture < DELAI_RELECTURE_MS) return false;   // anti-spam
  derniereLecture = Date.now();
  relectureEnCours = true;
  const uid = u.uid;
  lecteurProgramme(uid)
    .then(d => {
      // Le compte a change pendant la lecture : on jette le resultat.
      const c = utilisateur.peek();
      if (!c || c.uid !== uid || chargePour !== uid) return;
      if (!d) return;   // pas de document : rien a corriger
      const neuf = d.programme || null;
      if (!memeContenu(programmeBrut.peek(), neuf)) programmeBrut.value = neuf;
      const avant = dossierCoach.peek();
      const dos = { questionnaire: d.questionnaireCoach || null, commande: d.commandeCoach || null, accesPro: d.accesPro || null };
      // `brouillon` reste celui de la memoire : il s'ecrit en differe depuis ce telephone.
      if (!['questionnaire', 'commande', 'accesPro'].every(k => memeContenu(avant[k] || null, dos[k]))) dossierCoach.value = { ...avant, ...dos };
    })
    .catch(() => { /* hors ligne ou erreur : on garde le plan deja charge */ })
    .finally(() => { relectureEnCours = false; });
  return true;
}
if (typeof document !== 'undefined') {
  const auRetour = () => { if (document.visibilityState === 'visible') relireProgramme(); };
  document.addEventListener('visibilitychange', auRetour);
  window.addEventListener('focus', auRetour);
  window.addEventListener('pageshow', auRetour);
}

/** « il y a 3 jours », a partir d'une date ISO. */
/** Icone d'un repas d'apres son nom. */
function iconeRepas(nom) {
  const n = String(nom || '').toLowerCase();
  if (/petit/.test(n)) return 'sun';
  if (/collation|goûter|gouter|snack/.test(n)) return 'apple';
  if (/dîner|diner|souper|soir/.test(n)) return 'moon';
  return 'tools-kitchen';
}

function depuis(iso) {
  if (!iso) return null;
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (isNaN(j)) return null;
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return 'hier';
  if (j < 31) return `il y a ${j} jours`;
  const m = Math.floor(j / 30);
  return m === 1 ? 'il y a un mois' : `il y a ${m} mois`;
}

/** « 2 novembre » a partir d'un jour « AAAA-MM-JJ » (jour calendaire, sans fuseau). */
function jourLisible(j) {
  const d = new Date(j + 'T12:00:00Z');
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/** Prenom pour l'accueil : le compte, sinon la cle locale. */
function prenomCourt() {
  const u = utilisateur.value;
  const n = (u && u.displayName) || '';
  if (n) return n.split(' ')[0];
  try {
    return localStorage.getItem('repz_firstName')
      || (JSON.parse(localStorage.getItem('repz_profile') || '{}').prenom) || '';
  } catch (e) { return ''; }
}

const CLE_CHARGE = 'belfit_prog_charge';

/** Ce programme-ci a-t-il deja ete charge dans le journal ?
 *  On repere la version par sa date de livraison : un nouveau
 *  programme repart d'une ardoise propre, sans avertissement. */
function dejaCharge(pr) {
  try { return localStorage.getItem(CLE_CHARGE) === String(pr.livreLe); }
  catch (e) { return false; }
}
function marquerCharge(pr) {
  try { localStorage.setItem(CLE_CHARGE, String(pr.livreLe)); } catch (e) {}
}

/** Calories d'un repas du programme, calculees avec la base commune. */
function kcalRepas(r) {
  return (r.ings || []).reduce((t, i) => t + macrosOf(i).kcal, 0);
}

/** Unite affichee : piece pour les aliments comptes (oeufs, doses),
 *  gramme sinon. macrosOf ne renvoie pas cette information, elle vit
 *  sur l'entree de la base. */
function unite(nom) {
  const d = DB[nom];
  return d && d.unit ? (d.unitLabel || 'p') : 'g';
}

const Fleche = () => (
  <span class="bp-fleche" aria-hidden="true">
    <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
  </span>
);

export function BelfitPlus() {
  const ouvertProg = progOuvert.value;
  useRetour(ouvertProg, () => { progOuvert.value = false; });
  const setOuvertProg = (v) => { progOuvert.value = typeof v === 'function' ? v(progOuvert.value) : v; };
  const [charge, setCharge] = useState(false);
  const [demande, setDemande] = useState(null);   // null | 'ouvert' | 'envoi' | 'ok' | 'erreur'
  const [motDemande, setMotDemande] = useState('');

  useEffect(() => { if (!programmeCharge.value) chargerProgramme(); }, []);

  const pr = programme.value;
  const pret = programmeCharge.value;

  // Le programme est-il deja celui du journal ? Si oui, le bouton
  // d'application n'a plus lieu d'etre : proposer d'appliquer ce qui
  // est deja applique ferait douter de ce qui est en vigueur.
  const o = objectifs.value;
  const dejaApplique = pr && o.kcal === pr.kcal && o.prot === pr.prot
    && o.carbs === pr.carbs && o.lip === pr.lip;

  const aRepas = !!(pr && pr.repas && pr.repas.length);

  /** Charge le programme dans le journal du jour : objectifs ET repas
   *  (22/10 : repas poses en « prevus » sans ecraser la saisie du jour ;
   *  ils arrivent d'ailleurs seuls a l'ouverture, ce bouton re-seme). */
  const charger = () => {
    if (!pr) return;
    setObjectifs({ kcal: pr.kcal, prot: pr.prot, carbs: pr.carbs, lip: pr.lip });
    // 22/10 : meme regle que l'arrivee automatique, sans ecraser la saisie.
    if (aRepas) semerPlan(pr.repas);
    marquerCharge(pr);
    setCharge(true);
  };

  /** Demande d'ajustement. Le quota est verifie par le serveur ; ce
   *  qu'on affiche ici n'est qu'un rappel. */
  const envoyerDemande = async () => {
    setDemande('envoi');
    try {
      const u = utilisateur.value;
      const jeton = await u.getIdToken();
      const r = await fetch(URL_AJUSTEMENT, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jeton},
        body: JSON.stringify({message: motDemande.slice(0, 1000)}),
      });
      const d = await r.json();
      if (d && d.ok) {
        ajustements.value = {restants: null, quota: null};
        setDemande('ok');
        setMotDemande('');
      } else {
        setDemande(d && d.motif === 'quota' ? 'quota' : 'erreur');
      }
    } catch (e) {
      setDemande('erreur');
    }
  };

  // Sous-titre de la carte programme : trois etats distincts, jamais
  // de formule vague. Tant que Firestore n'a pas repondu on n'affiche
  // rien plutot qu'un texte qui changerait sous les yeux.
  let sousProg = '';
  if (pret) {
    if (!pr) sousProg = 'Ton coach prépare ton plan — livré sous 24 à 48 h.';
    else if (pr.enAttente) sousProg = pr.enAttente.debut ? `Ton plan commence le ${jourLisible(pr.enAttente.debut)}` : 'Plan reçu · la date de départ arrive bientôt';
    else if (dejaApplique) sousProg = `Actif · ${pr.kcal} kcal par jour` + (pr.versionActive && pr.versionActive.total > 1 ? ` · étape ${pr.versionActive.n} sur ${pr.versionActive.total}` : '');
    else sousProg = `Reçu ${depuis(pr.livreLe) || 'récemment'} · prêt à appliquer`;
  }

  // « Mon programme » ouvre une page a part entiere, pas un depliant
  // sous la carte d'accueil. Demande par Raci : le depliant obligeait
  // a defiler tout le plan pour atteindre les deux actions, et sans
  // programme il n'affichait rien du tout.
  if (ouvertProg) {
    return (
      <div class="pg-plus pg-prog">
        <Entete retour={() => setOuvertProg(false)} />
        <div class="prog-corps">
          <h1 class="prog-titre">Mon plan</h1>

          {!pret ? (
            <p class="prog-attente">Chargement…</p>
          ) : !pr ? (
            <div class="prog-vide">
              <p class="prog-vide-titre">Pas encore de programme</p>
              <p class="prog-vide-txt">Ton coach le construit à partir de tes objectifs.</p>
            </div>
          ) : (
            <>
              {/* Mise en page du 27/09 (Raci : « pas attirante ») : un
                  bandeau des totaux, puis une carte par repas. */}
              <p class="pc-sous">Reçu {depuis(pr.livreLe) || 'récemment'} · {pr.enAttente ? 'pas encore actif' : 'actif dans ton journal'}</p>
              {pr.enAttente && (
                <section class="pc-repas pc-attente">
                  <header><b>{pr.enAttente.debut ? `Ton plan commence le ${jourLisible(pr.enAttente.debut)}` : 'La date de départ arrive bientôt'}</b></header>
                  <p class="pc-sous">Ton coach t'a envoyé un plan par étapes. Il s'affichera ici, avec tes repas du jour, dès qu'il démarre.</p>
                </section>
              )}
              {pr.versionActive && pr.versionActive.total > 1 && (
                <p class="pc-sous pc-etape">
                  <b>Étape {pr.versionActive.n} sur {pr.versionActive.total}</b>
                  {pr.versionActive.libelle ? ` · ${pr.versionActive.libelle}` : ''}
                  {pr.versionActive.debut ? ` · depuis le ${jourLisible(pr.versionActive.debut)}` : ''}
                </p>
              )}
              {pr.prochaine && (
                <p class="pc-sous pc-etape">
                  Prochaine étape le {jourLisible(pr.prochaine.debut)}{pr.prochaine.kcal > 0 ? ` · ${Number(pr.prochaine.kcal).toLocaleString('fr-BE')} kcal par jour` : ''}
                </p>
              )}
              {!pr.enAttente && (<>
              <section class="pc-hero">
                <p class="pc-hero-lb">Par jour</p>
                <p class="pc-kcal"><b>{Number(pr.kcal).toLocaleString('fr-BE')}</b><span>kcal</span></p>
                {(() => {
                  const kp = pr.prot * 4, kg = pr.carbs * 4, kl = pr.lip * 9, tot = kp + kg + kl || 1;
                  return (
                    <div class="pc-barre" aria-hidden="true">
                      <i class="pc-p" style={{ width: (kp / tot * 100) + '%' }} />
                      <i class="pc-g" style={{ width: (kg / tot * 100) + '%' }} />
                      <i class="pc-l" style={{ width: (kl / tot * 100) + '%' }} />
                    </div>
                  );
                })()}
                <div class="pc-macros">
                  <div><span class="pc-pt pc-p" /><b>{pr.prot} g</b><em>protéines</em></div>
                  <div><span class="pc-pt pc-g" /><b>{pr.carbs} g</b><em>glucides</em></div>
                  <div><span class="pc-pt pc-l" /><b>{pr.lip} g</b><em>lipides</em></div>
                </div>
              </section>

              {(pr.repas || []).map((r, i) => (
                <section class="pc-repas" key={i}>
                  <header>
                    <span class="pc-ic"><Icone nom={iconeRepas(r.nom)} taille={17} /></span>
                    <b>{r.nom}</b>
                    <em>{Math.round(kcalRepas(r))} kcal</em>
                  </header>
                  {r.ings.map((ing, j) => (
                    <div class="pc-ing" key={j}>
                      <span>{ing.name}</span>
                      <em>{ing.portion} {unite(ing.name)}</em>
                    </div>
                  ))}
                </section>
              ))}
              </>)}

              {pr.note && (
                <section class="pc-note">
                  <span class="pc-av"><Icone nom="user" taille={17} /></span>
                  <div><b>Le mot de ton coach</b><p>{pr.note}</p></div>
                </section>
              )}

              {aRepas && (
                <button class="bp-appliquer" onClick={charger}>
                  {charge ? 'Repas ajoutés à ton journal' : 'Mettre ces repas dans mon journal'}
                </button>
              )}
              {aRepas && (
                <p class="bp-avis">Ils sont déjà dans ton journal en « prévus » : coche un repas quand tu l'as mangé, il compte alors dans ta journée.</p>
              )}
            </>
          )}

          {/* Plus de « Modifier mes objectifs » (27/09) : les objectifs
              viennent du plan du coach. */}
          <div class="prog-actions prog-actions--seul">
            <button
              class="prog-action"
              onClick={() => setOuvertProg(false)}
            >
              {/* 21/10 Raci : aucun prix ici, le 60 € n'apparait que dans Mon suivi. */}
              <b>Fermer</b>
            </button>
          </div>

          {demande === 'ok' ? (
            <p class="bp-ajust-ok">
              Demande envoyée. Ton coach te répond sous 24 à 48 h.
            </p>
          ) : demande === 'quota' ? (
            <p class="bp-ajust-ko">
              Ta demande n'a pas pu être envoyée. Écris à ton coach à contact@belfit.be.
            </p>
          ) : (demande === 'ouvert' || demande === 'envoi' || demande === 'erreur') ? (
            <div class="bp-ajust">
              <textarea
                class="bp-ajust-champ"
                maxLength={1000}
                placeholder="Ce qui ne va pas, ce que tu voudrais changer…"
                value={motDemande}
                onInput={(e) => setMotDemande(e.target.value)}
              />
              {demande === 'erreur' && <p class="bp-ajust-ko">L'envoi a échoué. Réessaie.</p>}
              <button class="bp-ajust-envoi" disabled={demande === 'envoi'} onClick={envoyerDemande}>
                {demande === 'envoi' ? 'Envoi…' : 'Envoyer ma demande'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div class="pg-plus">
      <Entete />

      {/* Carte d'accueil, d'apres la maquette. Sans photo : elle est
          barree sur l'image de reference. La carte occupe donc toute
          la largeur et respire par ses marges. */}
      <section class="bp-hero">
        {/* Le programme vit ici depuis que sa carte a fusionne avec le
            bouton : son visuel l'accompagne, a droite. */}
        <span class="bp-hero-visuel" aria-hidden="true" />
        <h1 class="bp-hero-titre">Bienvenue dans<br />ton espace.</h1>
        <span class="bp-hero-trait" aria-hidden="true" />
        <p class="bp-hero-sous">Tout ce dont tu as besoin pour progresser, réuni au même endroit.</p>
        <button class="bp-hero-cta" onClick={() => setOuvertProg(true)}>
          Mon plan <span aria-hidden="true">→</span>
        </button>
      </section>

      {/* 1. Le programme du coach. Premiere carte parce que c'est le
          premier benefice vendu, et le seul qui n'existe pas ailleurs
          dans l'app. */}
      <div class="bp-grille">

        {/* 2. Statistiques */}
        <button class="bp-carte" onClick={() => { statsAvOuvertes.value = true; }}>
          <span class="bp-visuel bp-visuel--stats" aria-hidden="true" />
          <span class="bp-corps">
            <span class="bp-nom">Mes statistiques avancées</span>
            <span class="bp-sous">Analyse détaillée de ta progression.</span>
          </span>
          <Fleche />
        </button>

        {/* 3. Recettes */}
        <button class="bp-carte" onClick={() => { origineIdees.value = 'premium'; allerOnglet('journal'); ideesOuvertes.value = true; }}>
          <span class="bp-visuel bp-visuel--recettes" aria-hidden="true" />
          <span class="bp-corps">
            <span class="bp-nom">Recettes intelligentes</span>
            <span class="bp-sous">Des idées adaptées à ton objectif.</span>
          </span>
          <Fleche />
        </button>

        {/* 4. Courses */}
        <button class="bp-carte" onClick={() => { origineCourses.value = 'premium'; allerOnglet('courses'); }}>
          <span class="bp-visuel bp-visuel--courses" aria-hidden="true" />
          <span class="bp-corps">
            <span class="bp-nom">Liste de courses intelligente</span>
            <span class="bp-sous">Générée automatiquement selon tes repas.</span>
          </span>
          <Fleche />
        </button>
      </div>

    </div>
  );
}
