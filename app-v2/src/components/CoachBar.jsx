import { useEffect, useRef, useState } from 'preact/hooks';
import { parserLocal, proposerRepas, composerSeance, SCHEMAS, portionJournal } from '../services/coach-local.js';
import { demanderCoach } from '../services/coach.js';
import { repas, objectifs, totauxJourAff, ajouterIngredient, ajouterEau, ajouterRepas } from '../store/journal.js';
import { seanceRefs, selectionExos, abandonnerSeance, portraitSeanceDuJour, ETAT, demandeVueEntrainer, poserBrouillon } from '../store/seance-active.js';
import { ongletActif } from './BottomNav.jsx';
import { planifierSeance } from '../store/programme.js';
import { EXERCISES, materielPrecis } from '../data/exercices.js';
import { customFoods } from './Scanner.jsx';
import { courses, origineCourses } from './Courses.jsx';
import { DB, macrosOf } from '../data/aliments.js';
import { t } from '../i18n/index.js';
import '../styles/coach-bar.css';

function repasCible(cle) {
  const liste = repas.value;
  return liste.find((r) => r.cle === cle) ||
    liste.find((r) => r.ings.length === 0) ||
    liste[liste.length - 1];
}

function nomRepas(cle) {
  const r = repas.value.find((x) => x.cle === cle);
  return r ? r.nom : '';
}

function kcalDe(l) {
  return Math.round(macrosOf({ name: l.cle, portion: l.portion }).kcal || 0);
}

function versLignes(aliments) {
  return (aliments || []).map((a) => {
    const cle = DB[a.aliment] || (customFoods.value || {})[a.aliment] ? a.aliment : null;
    if (!cle) return null;
    // 04/10 : aliment a l'unite = nombre de pieces dans le journal.
    return { cle, portion: portionJournal(cle, a.quantite, a.unite), repasCle: a.repasCle };
  }).filter(Boolean);
}

// Barre seance (04/10) : quatre questions avant de composer.
const QUESTIONS_SEANCE = [
  { cle: 'style', titre: 'Ton objectif', choix: [['hyper', 'Prise de muscle'], ['force', 'Force'], ['endu', 'Endurance / sèche']] },
  { cle: 'duree', titre: 'Ton temps', choix: [['court', '30 min'], ['normal', '45 min'], ['long', '1 h ou plus']] },
  { cle: 'mat', titre: 'Ton matériel', choix: [['salle', 'Salle complète'], ['halteres', 'Haltères'], ['rien', 'Poids du corps']] },
  { cle: 'niveau', titre: 'Ton niveau', choix: [['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['confirme', 'Avancé']] },
];
const MATS_COACH = {
  salle: ['barre', 'machine', 'halteres', 'kettlebell', 'elastique'],
  halteres: ['halteres', 'kettlebell'],
  rien: ['rien', 'traction'],
};
const MOT_DUREE = { court: ' 30 min', normal: '', long: ' 1h' };

/** Compose la seance selon les 4 reponses : materiel respecte, volume selon le niveau. */
function composerAvecReponses(phrase, rep) {
  const out = composerSeance('seance ' + phrase + MOT_DUREE[rep.duree], rep.style);
  if (!out || out.action !== 'composerSeance') return out;
  // Materiel exact (data/exercices.js, 15/10) : l'elastique n'est plus
  // devine au nom. Meme resultat qu'avant — « Halteres » garde les
  // kettlebells et ecarte l'elastique ; « Salle complete » garde tout
  // sauf le poids du corps.
  const mats = MATS_COACH[rep.mat];
  const okMat = (e) => !mats || mats.includes(materielPrecis(e));
  const vus = new Set(out.refs.map((r) => r.mKey + ':' + r.i));
  const refs = out.refs.map((r) => {
    const e = (EXERCISES[r.mKey] || [])[r.i];
    if (e && okMat(e)) return r;
    const liste = EXERCISES[r.mKey] || [];
    const j = liste.findIndex((x, k) => okMat(x) && !vus.has(r.mKey + ':' + k));
    if (j < 0) return null;
    vus.add(r.mKey + ':' + j);
    return { mKey: r.mKey, i: j };
  }).filter(Boolean);
  if (!refs.length) return { action: 'aucuneSeance', texte: 'Je ne trouve pas d\'exercice pour ce matériel. Essaie un autre choix.' };
  const delta = rep.niveau === 'debutant' ? -1 : rep.niveau === 'confirme' ? 1 : 0;
  const schema = { ...out.schema, series: Math.max(2, out.schema.series + delta) };
  schema.resume = schema.series + ' × ' + schema.reps + out.schema.resume.replace(/^\d+ × \d+/, '');
  const noms = refs.map((r) => EXERCISES[r.mKey][r.i].nom);
  return { ...out, refs, noms, schema,
    texte: out.titre + ' — ' + refs.length + ' exercices · ' + schema.resume + '.' };
}

// `titre` : libelle optionnel a la place de « Coach ». S'entrainer
// s'en sert pour dire a quoi sert la barre (proposition du 7/10).
export function CoachBar({ mode = 'repas', titre }) {
  const enSeance = mode === 'seance';
  const [quiz, setQuiz] = useState(null); // { phrase, titre, etape, rep }
  const [texte, setTexte] = useState('');
  const [etat, setEtat] = useState('pret');
  const [msg, setMsg] = useState('');
  const [lignes, setLignes] = useState([]);
  const [eauLitres, setEauLitres] = useState(0);
  const [diner, setDiner] = useState(null);
  const [seance, setSeance] = useState(null);
  // Type de la ligne a creer au moment d'ajouter (23/09), ou null.
  const [nouvelleLigne, setNouvelleLigne] = useState(null);
  const ajoutRef = useRef(null);
  const ouvert = etat === 'proposition' || etat === 'diner' || etat === 'seance' || etat === 'seancePosee' || etat === 'style' || etat === 'quiz';
  // Seance sans objectif precise : on le demande (28/09).
  const [styleDemande, setStyleDemande] = useState(null);

  useEffect(() => {
    if (!ouvert) return;
    const el = ajoutRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }, [ouvert, lignes.length, diner, seance]);

  const appliquer = (out) => {
    // « Fais-moi les courses de la semaine » (v539, branche le 22/09).
    // La liste se fabrique deja depuis le journal dans Courses.jsx : le
    // coach n'a qu'a en regler la duree et le nombre de personnes, puis
    // l'ouvrir. C'est ce qui en fait un agent plutot qu'une reponse —
    // il ecrit dans l'outil au lieu de decrire une liste dans une bulle.
    if (out.action === 'majCourses') {
      const proche = (v, choix) => choix.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
      courses.value = {
        ...courses.value,
        jours: proche(out.jours || 7, [3, 5, 7]),
        pers: Math.min(4, Math.max(1, out.pers || 1)),
        genere: true,
      };
      setMsg(out.texte || '');
      setLignes([]);
      setEtat('pret');
      setTexte('');
      if ((out.noms || []).length) { origineCourses.value = 'journal'; ongletActif.value = 'courses'; }
      return;
    }

    if (out.action === 'creerLigne') {
      ajouterRepas(out.ligne);
      setMsg(out.texte);
      setLignes([]);
      setNouvelleLigne(null);
      setEtat('pret');
      setTexte('');
      return;
    }
    // 04/10 (Raci) : la barre sert aux repas et a l'eau. Les seances
    // vivent dans S'entrainer (programmes prets, seance libre) : une
    // demande de seance est renvoyee la-bas, les aliments eventuels de
    // la meme phrase restent notes.
    if (out.action === 'aucuneSeance') { setMsg(out.texte); setEtat('pret'); return; }
    if (!enSeance && (out.action === 'abandonnerSeance' || out.action === 'demarrerSeance' || out.action === 'choixStyle'
      || out.action === 'composerSeance' || out.seance)) {
      const restes = versLignes(out.aliments);
      const eauS = Number(out.eauLitres) || 0;
      setSeance(null); setStyleDemande(null); setDiner(null); setNouvelleLigne(null);
      setEauLitres(eauS);
      setLignes(restes);
      setMsg(t('coach_vers_entrainer'));
      setEtat((restes.length || eauS) ? 'proposition' : 'pret');
      setTexte('');
      return;
    }
    if (out.action === 'abandonnerSeance') {
      abandonnerSeance();
      setSeance(null);
      setLignes([]);
      setEauLitres(0);
      setDiner(null);
      setMsg(out.texte || t('coach_jetee'));
      setEtat('pret');
      setTexte('');
      return;
    }
    if (out.action === 'demarrerSeance') {
      const p = portraitSeanceDuJour();
      setMsg(out.texte || t('coach_on_y_va'));
      setEtat('pret');
      setTexte('');
      if (p.etat === ETAT.PREVUE && p.seanceId) {
        ongletActif.value = 'entrainer';
        demandeVueEntrainer.value = { nom: 'seanceDetail', params: { seanceId: p.seanceId, titre: p.titre, depuis: 'journal' } };
      } else if (p.etat === ETAT.BROUILLON || p.etat === ETAT.EN_COURS) {
        ongletActif.value = 'entrainer';
        demandeVueEntrainer.value = {
          nom: p.origine === 'programme' ? 'seanceDetail' : 'maseance',
          params: p.seanceId ? { seanceId: p.seanceId, titre: p.titre } : null,
        };
      } else {
        ongletActif.value = 'entrainer';
        demandeVueEntrainer.value = { nom: 'selection', params: null };
      }
      return;
    }
    if (out.action === 'choixStyle') {
      setStyleDemande({ phrase: out.phrase, titre: out.titre });
      setSeance(null);
      setLignes([]);
      setDiner(null);
      setMsg(out.texte);
      setEtat('style');
      setTexte('');
      return;
    }
    if (out.action === 'composerSeance') {
      setStyleDemande(null);
      setSeance({
        composer: true,
        titre: out.titre,
        refs: out.refs,
        noms: out.noms || [],
        schema: out.schema || null,
        iso: out.iso || null,
        quand: out.quand || null,
        texte: out.texte,
      });
      setLignes(versLignes(out.aliments));
      setEauLitres(Number(out.eauLitres) || 0);
      setDiner(null);
      setMsg(out.texte);
      setEtat('seance');
      setTexte('');
      return;
    }
    if (out.seance) {
      setSeance(out.seance);
      setLignes([]);
      setEauLitres(0);
      setDiner(null);
      setMsg(out.seance.texte);
      setEtat('seance');
      setTexte('');
      return;
    }
    const trouves = versLignes(out.aliments);
    const eau = Number(out.eauLitres) || 0;
    setNouvelleLigne(out.nouvelleLigne || null);
    setSeance(null);
    setEauLitres(eau);
    setDiner(null);
    setMsg(out.texte || t('coach_verifie'));
    setLignes(trouves);
    setEtat((trouves.length || eau) ? 'proposition' : 'pret');
    if (trouves.length || eau) setTexte('');
  };

  /**
   * Deux cerveaux, dans cet ordre (22/09).
   *
   * Le coach LOCAL repond d'abord : instantane, gratuit, hors ligne. Il
   * connait les aliments de la base, l'eau, les seances, les courses.
   * Le coach SERVEUR (coachAgent, Gemini) n'est appele que quand le
   * local n'a rien compris — c'est lui qui sait lire « un bol de pates
   * carbo chez ma mere ». Chaque appel Gemini est facture : le serveur
   * est un filet, pas le premier recours.
   *
   * Si le serveur n'est pas deploye, pas connecte ou injoignable, on
   * garde la reponse locale : la barre ne casse jamais.
   */
  const envoyer = async () => {
    const dit = texte.trim();
    if (!dit) return;
    const contexte = {
      objectifs: objectifs.value,
      totaux: totauxJourAff.value,
      seanceRefs: seanceRefs.value,
      repas: repas.value,
    };
    if (enSeance) {
      // Muscles reconnus : les quatre questions. Sinon on guide.
      const essai = composerSeance('seance ' + dit, 'hyper');
      if (essai && essai.action === 'composerSeance') {
        setSeance(null); setLignes([]); setTexte('');
        setQuiz({ phrase: dit, titre: (essai.muscles || []).length ? essai.titre.replace(/ · .*$/, '') : essai.titre, etape: 0, rep: {} });
        setMsg(''); setEtat('quiz');
        return;
      }
      const l2 = parserLocal(dit, contexte);
      setMsg((l2.aliments || []).length || l2.eauLitres
        ? 'Pour noter un repas, ajoute-le dans l\'onglet Aujourd\'hui.'
        : 'Dis-moi les muscles à travailler, par exemple « pecs biceps » ou « jambes ».');
      setEtat('pret');
      return;
    }
    const local = parserLocal(dit, contexte);
    const compris = local.action || (local.aliments || []).length || local.eauLitres;
    // Tout compris sans IA (phrase simple) : instantane et gratuit.
    // Sinon le coach IA du serveur lit la phrase entiere (04/10).
    if (compris && (local.action || !(local.incompris || []).length)) { appliquer(local); return; }

    setMsg('…');
    try {
      const distant = await demanderCoach(dit, {
        objectifs: contexte.objectifs,
        totaux: contexte.totaux,
      });
      if ((distant.aliments || []).length || distant.eauLitres) {
        // Aliments hors base : memorises comme aliments perso (valeurs IA).
        const nouveaux = {};
        (distant.aliments || []).forEach((a) => { if (a.horsBase && !DB[a.aliment]) nouveaux[a.aliment] = a.horsBase; });
        if (Object.keys(nouveaux).length) customFoods.value = { ...customFoods.value, ...nouveaux };
        const hh = new Date().getHours();
        const repasDit = distant.repas || (local.aliments && local.aliments[0] && local.aliments[0].repasCle)
          || (hh < 11 ? 'pdej' : hh < 15 ? 'dej' : hh < 21 ? 'diner' : 'snack');
        // Filet de securite : un aliment lu localement que l'IA a oublie
        // (meme premier mot absent de sa reponse) est ajoute.
        const premier = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[\s(]/)[0];
        const vusIA = new Set((distant.aliments || []).map((a) => premier(a.aliment)));
        const oublies = (local.aliments || []).filter((a) => !vusIA.has(premier(a.aliment)));
        const aliments = [...(distant.aliments || []), ...oublies].map((a) => ({ ...a, repasCle: repasDit || a.repasCle }));
        const m = aliments.reduce((t, a) => t + (macrosOf({ name: a.aliment, portion: portionJournal(a.aliment, a.quantite, a.unite) }).kcal || 0), 0);
        appliquer({ aliments, eauLitres: distant.eauLitres || 0,
          texte: 'Coach : ' + aliments.map((a) => a.aliment + ' ' + a.quantite + ' g').join(', ')
            + (distant.eauLitres ? (aliments.length ? ' + ' : '') + distant.eauLitres + ' L d\'eau' : '')
            + (aliments.length ? ' \u2248 ' + Math.round(m) + ' kcal.' : '') + ' Vérifie puis ajoute.' });
      } else if (compris) appliquer(local);
      else { setMsg('Je n\'ai trouvé ni aliment ni boisson dans ta phrase.'); setEtat('pret'); }
    } catch (e) {
      if (e && e.status === 429) { setMsg('Tu as utilisé tes analyses IA d\'aujourd\'hui. Les phrases simples (« 200 g de riz ») restent comprises.'); setEtat('pret'); return; }
      appliquer(local);
    }
  };

  const ecrireAliments = () => {
    // Nouvelle ligne demandee : on la cree, et TOUT y va.
    const idNouvelle = nouvelleLigne && lignes.length ? ajouterRepas(nouvelleLigne) : null;
    setNouvelleLigne(null);
    lignes.forEach((l) => {
      if (l.portion <= 0) return;
      if (idNouvelle) { ajouterIngredient(idNouvelle, l.cle, l.portion); return; }
      const cible = repasCible(l.repasCle);
      if (cible) ajouterIngredient(cible.id, l.cle, l.portion);
    });
    if (eauLitres > 0) ajouterEau(eauLitres);
    return lignes.length || eauLitres;
  };

  const confirmer = () => {
    const n = ecrireAliments();
    setLignes([]);
    setEauLitres(0);
    if (!n) { setMsg(''); setEtat('pret'); return; }
    const prop = proposerRepas(objectifs.value, totauxJourAff.value);
    if (prop && prop.ings && prop.ings.length) {
      setDiner(prop);
      setMsg(t('coach_dans_prochain'));
      setEtat('diner');
    } else {
      setMsg(t('coach_dans_journal'));
      setEtat('pret');
    }
  };

  const allerMaSeance = () => {
    ongletActif.value = 'entrainer';
    demandeVueEntrainer.value = { nom: 'maseance', params: null };
  };

  const confirmerSeance = () => {
    if (!seance) return;
    ecrireAliments();
    setLignes([]);
    setEauLitres(0);
    // Un autre jour que ce soir : la seance part au calendrier, pas en
    // brouillon (23/09). Elle se lance depuis la tuile ou la fiche du
    // jour, le moment venu.
    if (seance.composer && seance.iso && seance.refs && seance.refs.length) {
      const exos = seance.refs.map((r) => {
        const ex = EXERCISES[r.mKey] && EXERCISES[r.mKey][r.i];
        return ex ? r.mKey + ':' + ex.nom : null;
      }).filter(Boolean);
      planifierSeance(seance.iso, {
        seanceId: 'coach-' + seance.iso,
        titre: seance.titre,
        sub: exos.length + ' exercices' + (seance.schema ? ' · ' + seance.schema.resume : ''),
        exos,
        schema: seance.schema || null,
      });
      setSeance(null);
      setMsg(seance.titre + ' — ' + t('coach_seance_planifiee').replace('{j}', seance.quand || ''));
      setEtat('pret');
      return;
    }
    if (seance.composer && seance.refs && seance.refs.length) {
      const sel = {};
      seance.refs.forEach((r) => {
        if (!sel[r.mKey]) sel[r.mKey] = new Set();
        sel[r.mKey].add(r.i);
      });
      selectionExos.value = sel;
      poserBrouillon({
        titre: seance.titre,
        refs: seance.refs.map((r) => ({ mKey: r.mKey, i: r.i })),
        origine: 'libre',
        schema: seance.schema || null,
      });
      setSeance(null);
      setMsg(seance.titre + ' — ' + t('coach_seance_posee'));
      setEtat('seancePosee');
      return;
    }
    if (seance.swaps && seance.swaps.length) {
      const next = seanceRefs.value.slice();
      seance.swaps.forEach((s) => {
        if (s.source === 'libre' && s.vers && typeof s.idx === 'number') {
          next[s.idx] = { mKey: s.vers.mKey, i: s.vers.i };
        }
      });
      seanceRefs.value = next;
    }
    setSeance(null);
    setMsg(seance.swaps && seance.swaps.length
      ? t('coach_seance_ok')
      : t('coach_seance_rien'));
    setEtat('pret');
  };

  const aConfirmer = lignes.length > 0 || eauLitres > 0;
  const kcalProp = lignes.reduce((s, l) => s + kcalDe(l), 0);
  const reste = (objectifs.value.kcal || 0) - (totauxJourAff.value.kcal || 0) - kcalProp;

  return (
    <div class={'coach-bar' + (ouvert ? ' coach-bar--ouvert' : '')}>
      <div class="coach-kicker">{titre || t('coach_kicker')}</div>
      <div class="coach-bar-ligne">
        <input
          class="coach-bar-champ"
          type="text"
          maxlength="240"
          placeholder={enSeance ? 'Ex. aujourd\'hui je fais pecs biceps' : t('coach_placeholder')}
          value={texte}
          onInput={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') envoyer(); }}
        />
        <button class="coach-bar-go" type="button" disabled={!texte.trim()} onClick={envoyer}>OK</button>
      </div>
      {msg && <p class="coach-bar-msg">{msg}</p>}
      {etat === 'proposition' && aConfirmer && (
        <>
          {lignes.map((l, i) => (
            <div class="coach-bar-ligne-alim" key={i}>
              <span>
                {l.cle} — {l.portion} {DB[l.cle] && DB[l.cle].unit ? (DB[l.cle].unitLabel || 'pièce') + (l.portion > 1 ? 's' : '') : 'g'}
                {!nouvelleLigne && nomRepas(l.repasCle) ? ' · ' + nomRepas(l.repasCle) : ''}
                {kcalDe(l) ? ' · ' + kcalDe(l) + ' kcal' : ''}
              </span>
              <button type="button" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>x</button>
            </div>
          ))}
          {eauLitres > 0 && (
            <div class="coach-bar-ligne-alim">
              <span>{String(eauLitres).replace('.', ',')} L · {t('coach_eau')}</span>
            </div>
          )}
          {kcalProp > 0 && (
            <p class="coach-bar-ecart">
              {t('coach_kcal').replace('{n}', String(kcalProp))}
              {objectifs.value.kcal
                ? ' · ' + (reste > 0
                  ? t('coach_reste').replace('{n}', String(Math.round(reste)))
                  : t('coach_depasse').replace('{n}', String(Math.round(-reste))))
                : ''}
            </p>
          )}
          <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={confirmer}>
            {t('coach_ajouter')}
          </button>
        </>
      )}
      {etat === 'diner' && diner && (
        <div class="coach-bar-diner">
          <p class="coach-bar-diner-nom">{diner.nom}</p>
          <p class="coach-bar-diner-macros">{diner.kcal} kcal · P {diner.prot} · G {diner.carbs} · L {diner.lip}</p>
          {diner.ings.map((a, i) => (
            <div class="coach-bar-ligne-alim" key={i}>
              <span>{a.aliment} — {a.quantite} {a.unite === 'piece' ? 'p' : 'g'}</span>
            </div>
          ))}
          <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={() => {
            diner.ings.forEach((a) => {
              const cible = repasCible('diner');
              if (!cible) return;
              const d = DB[a.aliment];
              const portion = a.unite === 'piece' && d && d.unit ? a.quantite * d.unit : a.quantite;
              ajouterIngredient(cible.id, a.aliment, Math.round(portion));
            });
            setDiner(null); setMsg(t('coach_dans_journal')); setEtat('pret');
          }}>{t('coach_ajouter_diner')}</button>
          <button class="coach-bar-passe" type="button" onClick={() => { setDiner(null); setEtat('pret'); setMsg(''); }}>{t('coach_pas_maintenant')}</button>
        </div>
      )}
      {etat === 'quiz' && quiz && (() => {
        const q = QUESTIONS_SEANCE[quiz.etape];
        return (
          <div class="coach-bar-diner coach-bar-style">
            <p class="coach-bar-diner-nom">{quiz.titre} · {quiz.etape + 1}/4 · {q.titre}</p>
            {q.choix.map(([v, lib]) => (
              <button class="coach-bar-style-bt" type="button" key={v} onClick={() => {
                const rep = { ...quiz.rep, [q.cle]: v };
                if (quiz.etape < 3) { setQuiz({ ...quiz, etape: quiz.etape + 1, rep }); return; }
                setQuiz(null);
                const out = composerAvecReponses(quiz.phrase, rep);
                if (out) appliquer(out); else { setMsg('Je n\'ai pas pu composer cette séance.'); setEtat('pret'); }
              }}><b>{lib}</b></button>
            ))}
            <button class="coach-bar-passe" type="button" onClick={() => { setQuiz(null); setEtat('pret'); setMsg(''); }}>{t('coach_pas_maintenant')}</button>
          </div>
        );
      })()}
      {etat === 'style' && styleDemande && (
        <div class="coach-bar-diner coach-bar-style">
          <p class="coach-bar-diner-nom">{styleDemande.titre}</p>
          {Object.values(SCHEMAS).map((s) => (
            <button class="coach-bar-style-bt" type="button" key={s.cle}
              onClick={() => { const out = composerSeance(styleDemande.phrase, s.cle); if (out) appliquer(out); }}>
              <b>{s.label === 'Volume' ? 'Prise de muscle' : s.label}</b><span>{s.resume}</span>
            </button>
          ))}
          <button class="coach-bar-passe" type="button" onClick={() => { setStyleDemande(null); setEtat('pret'); setMsg(''); }}>{t('coach_pas_maintenant')}</button>
        </div>
      )}
      {etat === 'seance' && seance && (
        <div class="coach-bar-diner">
          <p class="coach-bar-diner-nom">{seance.titre}</p>
          {(seance.noms || []).map((nom, i) => (
            <div class="coach-bar-ligne-alim" key={'n' + i}>
              <span>{nom}</span>
              {seance.schema && <span class="coach-bar-schema">{seance.schema.series}×{seance.schema.reps}</span>}
            </div>
          ))}
          {(seance.swaps || []).map((s, i) => (
            <div class="coach-bar-ligne-alim" key={'s' + i}>
              <span>{s.deNom} → {s.versNom}</span>
            </div>
          ))}
          {lignes.map((l, i) => (
            <div class="coach-bar-ligne-alim" key={'a' + i}>
              <span>
                {l.cle} — {l.portion} {DB[l.cle] && DB[l.cle].unit ? (DB[l.cle].unitLabel || 'pièce') + (l.portion > 1 ? 's' : '') : 'g'}
                {kcalDe(l) ? ' · ' + kcalDe(l) + ' kcal' : ''}
              </span>
              <button type="button" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>x</button>
            </div>
          ))}
          {seance.composer && seance.refs && seance.refs.length > 0 && (
            <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={confirmerSeance}>
              {seance.quand ? t('coach_poser_pour').replace('{j}', seance.quand) : t('coach_poser_seance')}
            </button>
          )}
          {seance.swaps && seance.swaps.length > 0 && (
            <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={confirmerSeance}>
              {t('coach_appliquer_seance')}
            </button>
          )}
          <button class="coach-bar-passe" type="button" onClick={() => { setSeance(null); setLignes([]); setEtat('pret'); setMsg(''); }}>{t('coach_pas_maintenant')}</button>
        </div>
      )}
      {etat === 'seancePosee' && (
        <button ref={ajoutRef} class="coach-bar-ajout" type="button" onClick={allerMaSeance}>
          {t('coach_commencer')}
        </button>
      )}
    </div>
  );
}
