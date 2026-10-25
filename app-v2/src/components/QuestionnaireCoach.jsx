// Questionnaire du plan coach — v2 (26/09, maquettes validees par Raci).
// Suit sa banque de questions, section par section : accueil avec la
// liste des sections, une section par ecran, recapitulatif avec les
// consentements, puis envoi. Brouillon garde sur l'appareil ET dans
// Firestore : le client reprend la ou il s'est arrete, sur n'importe
// quel appareil.
import { useState, useEffect, useRef } from 'preact/hooks';
import { getApps } from 'firebase/app';
import { utilisateur } from '../services/firebase.js';
import { dossierCoach } from './BelfitPlus.jsx';
import { Entete } from './Entete.jsx';
import { Icone } from './IconesCoach.jsx';
import { useRetour } from '../services/retour.js';
import { profilBesoins, poidsCalcul } from '../store/journal.js';
import { PREMIER_PLAN, MISE_A_JOUR, CONSENTEMENTS, LIENS_LEGAUX, repondue, lisible, alerteSante, allergieGrave, optionsDe , optionsAliments } from '../data/questionnaire-coach.js';
import { NOMS_ALIMENTS } from '../data/aliments.js';

// Par compte (27/09) : un autre compte sur le meme appareil ne reprend
// pas le brouillon du precedent.
const cleBrouillon = type => 'belfit_qc_brouillon_' + type + '_' + ((utilisateur.peek() || {}).uid || 'anonyme');

function prerempli(type) {
  const p = profilBesoins.value || {};
  const u = utilisateur.value || {};
  const r = {};
  const poids = p.poids || poidsCalcul.value;
  if (poids) r.poids = { valeur: String(poids) };
  if (type === 'plan') {
    if (u.displayName) r.prenom = { valeur: String(u.displayName).split(' ')[0] };
    if (u.email) r.email = { valeur: u.email };
    if (p.taille) r.taille = { valeur: String(p.taille) };
    if (p.age) r.age = { valeur: String(p.age) };
    if (p.sexe) r.sexe = { valeur: p.sexe === 'f' ? 'Femme' : 'Homme' };
  }
  return r;
}

function lireBrouillon(type) {
  // Deux copies : l'appareil et Firestore. On garde la plus recente.
  let local = null;
  try { const b = JSON.parse(localStorage.getItem(cleBrouillon(type))); if (b && b.rep) local = b; }
  catch (e) { /* brouillon illisible : on repart de zero */ }
  const d = dossierCoach.value.brouillon;
  const distant = d && d.type === type && d.rep ? d : null;
  if (local && distant) return (distant.majLe || '') > (local.majLe || '') ? distant : local;
  return local || distant;
}

function sauverDistant(type, b) {
  const u = utilisateur.value;
  if (!u || !getApps().length) return Promise.resolve(false);
  return import('firebase/firestore').then(({ getFirestore, doc, setDoc }) =>
    setDoc(doc(getFirestore(getApps()[0]), 'users', u.uid), { brouillonCoach: { type, ...b } }, { merge: true }))
    .then(() => true);
}
// Hors reseau, la promesse Firestore attend le serveur : au bout de
// 5 s, on dit la verite, « garde sur ce telephone ».
function sauverAvecDelai(type, b) {
  return Promise.race([sauverDistant(type, b), new Promise(r => setTimeout(() => r(false), 5000))]);
}

export function effacerBrouillon(type) {
  try { localStorage.removeItem(cleBrouillon(type)); } catch (e) { /* rien */ }
}

// ---------- Champs ----------

// Saisie directe d'un nombre (poids, taille…) : clavier numerique.
function Saisie({ q, r, maj }) {
  return (
    <div class="qc-saisie">
      <input inputMode="decimal" value={r.valeur ?? ''} placeholder="—"
        onInput={e => maj({ ...r, valeur: e.currentTarget.value.replace(/[^0-9.,]/g, '') })} />
      {q.unite && <small>{q.unite}</small>}
    </div>
  );
}

// Roulette horizontale (Raci, 26/09) : on fait defiler, le chiffre au
// centre est choisi. Un appui sur un chiffre le choisit aussi.
function Roulette({ q, r, maj }) {
  const ref = useRef(null);
  const minuteur = useRef(null);
  const nombres = [];
  for (let n = q.min; n <= q.max; n++) nombres.push(n);
  const choisi = r.valeur === undefined || r.valeur === '' ? null : +r.valeur;
  const centrer = (n, doux) => {
    const el = ref.current && ref.current.querySelector('[data-n="' + n + '"]');
    if (el) ref.current.scrollTo({ left: el.offsetLeft - ref.current.clientWidth / 2 + el.clientWidth / 2, behavior: doux ? 'smooth' : 'auto' });
  };
  useEffect(() => { if (choisi !== null) centrer(choisi, false); }, []);
  const auDefilement = () => {
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      const box = ref.current; if (!box) return;
      const milieu = box.scrollLeft + box.clientWidth / 2;
      let meilleur = null, ecart = Infinity;
      box.querySelectorAll('[data-n]').forEach(el => {
        const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - milieu);
        if (d < ecart) { ecart = d; meilleur = +el.dataset.n; }
      });
      if (meilleur !== null && meilleur !== choisi) maj({ ...r, valeur: String(meilleur) });
    }, 120);
  };
  return (
    <div class="qc-roulette">
      <div class="qc-roulette-piste" ref={ref} onScroll={auDefilement}>
        {nombres.map(n => (
          <button type="button" data-n={n} class={n === choisi ? 'on' : ''} aria-pressed={n === choisi}
            onClick={() => { maj({ ...r, valeur: String(n) }); centrer(n, true); }}>{n}</button>
        ))}
      </div>
      <span class="qc-roulette-repere" aria-hidden="true" />
    </div>
  );
}

function Compteur({ q, r, maj }) {
  const pas = q.pas || 1;
  const n = parseFloat(String(r.valeur ?? '').replace(',', '.'));
  const vide = isNaN(n);
  const borne = x => Math.min(q.max ?? 999, Math.max(q.min ?? 0, x));
  const bouge = d => maj({ ...r, valeur: String(+(borne((vide ? (q.defaut ?? 0) : n) + d)).toFixed(pas < 1 ? 1 : 0)).replace(/\.0$/, '') });
  return (
    <div class="qc-num">
      <button type="button" aria-label="Moins" onClick={() => bouge(-pas)}>−</button>
      <span class="qc-num-val">
        <input inputMode="decimal" value={r.valeur ?? ''} placeholder={String(q.defaut ?? '')}
          onInput={e => maj({ ...r, valeur: e.currentTarget.value })} />
        {q.unite && <small>{q.unite}</small>}
      </span>
      <button type="button" aria-label="Plus" onClick={() => bouge(pas)}>+</button>
    </div>
  );
}

// « Tes aliments » (28/09) : puces par categorie avec compteur, et une
// recherche dans la base BELFIT pour ajouter ce qui manque.
const sansAccent = (x) => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function ChoixAliments({ q, r, toutes, maj }) {
  const vs = r.valeurs || [];
  const [cherche, setCherche] = useState('');
  const basculer = (o) => maj({ ...r, valeurs: vs.includes(o) ? vs.filter((x) => x !== o) : [...vs, o] });
  const connus = new Set((q.categories || []).flatMap((c) => c.options));
  const autres = vs.filter((x) => !connus.has(x));
  const n = sansAccent(cherche.trim());
  const props = n.length < 2 ? [] : NOMS_ALIMENTS.filter((nom) => sansAccent(nom).includes(n) && !vs.includes(nom)).slice(0, 6);
  return (
    <div class="qc-alim">
      {(q.categories || []).map((c) => {
        const opts = optionsAliments(c, toutes || {});
        if (!opts.length) return null;
        const pris = opts.filter((o) => vs.includes(o)).length;
        const min = Math.min(c.min || 0, opts.length);
        return (
          <div class="qc-alim-cat" data-min={min}>
            <p class="qc-alim-tete"><b>{c.nom}</b>
              <em class={pris >= min ? 'ok' : ''}>{min ? (pris >= min ? pris + ' choisi' + (pris > 1 ? 's' : '') : pris + ' / ' + min + ' min.') : (pris ? pris + ' choisi' + (pris > 1 ? 's' : '') : 'facultatif')}</em>
            </p>
            <div class="qc-puces">
              {opts.map((o) => (
                <button type="button" class={'qc-puce' + (vs.includes(o) ? ' on' : '')} aria-pressed={vs.includes(o)} onClick={() => basculer(o)}>{o}</button>
              ))}
            </div>
          </div>
        );
      })}
      {autres.length > 0 && (
        <div class="qc-puces qc-alim-autres">
          {autres.map((o) => <button type="button" class="qc-puce on" onClick={() => basculer(o)}>{o} ×</button>)}
        </div>
      )}
      <div class="qc-alim-cherche">
        <Icone nom="search" taille={16} />
        <input class="qc-champ" placeholder="Ajouter un autre aliment…" value={cherche} onInput={(e) => setCherche(e.currentTarget.value)} />
      </div>
      {props.length > 0 && (
        <div class="qc-alim-props">
          {props.map((nom) => <button type="button" onClick={() => { basculer(nom); setCherche(''); }}>{nom}</button>)}
        </div>
      )}
    </div>
  );
}

function Question({ q, rep, toutes, maj, erreur }) {
  const r = rep || {};
  const opts = optionsDe(q, toutes);
  const icones = Object.fromEntries((q.options || []).filter(Array.isArray));
  const [info, setInfo] = useState(false);
  const exclusifs = q.exclusifs || (q.aucun ? [q.aucun] : []);
  const actif = o => q.type === 'plusieurs' ? (r.valeurs || []).includes(o) : r.valeur === o;
  const choisir = o => {
    if (q.type !== 'plusieurs') return maj({ ...r, valeur: o });
    let vs = r.valeurs || [];
    if (vs.includes(o)) vs = vs.filter(x => x !== o);
    else if (exclusifs.includes(o)) vs = [o];
    else vs = [...vs.filter(x => !exclusifs.includes(x)), o];
    maj({ ...r, valeurs: vs });
  };
  // Champ a preciser seulement si la question le demande (`autre`).
  const autreOuvert = !!q.autre && (q.type === 'plusieurs' ? (r.valeurs || []).includes('Autre') : r.valeur === 'Autre');
  return (
    <div class={'qc-carte' + (erreur ? ' qc-carte--err' : '')} data-facultatif={q.facultatif ? '' : undefined}>
      <p class="qc-label">{q.label}
        {q.info && (
          <button type="button" class={'qc-info' + (info ? ' on' : '')} aria-label="Explication" aria-expanded={info} onClick={() => setInfo(!info)}>
            <Icone nom="info" taille={16} />
          </button>
        )}
      </p>
      {q.info && info && <p class="qc-info-txt">{q.info}</p>}
      {q.type === 'tuiles' && (
        <div class="qc-tuiles">
          {opts.map(o => (
            <button type="button" class={'qc-tuile' + (actif(o) ? ' on' : '')} aria-pressed={actif(o)} onClick={() => choisir(o)}>
              {icones[o] && <Icone nom={icones[o]} />}<span>{o}</span>
            </button>
          ))}
        </div>
      )}
      {(q.type === 'un' || q.type === 'plusieurs') && (
        <div class="qc-puces">
          {opts.map(o => (
            <button type="button" class={'qc-puce' + (actif(o) ? ' on' : '')} aria-pressed={actif(o)} onClick={() => choisir(o)}>{o}</button>
          ))}
        </div>
      )}
      {q.type === 'plusieurs' && <p class="qc-aide">Plusieurs choix possibles</p>}
      {autreOuvert && (
        <input class="qc-champ" placeholder="Précise…" value={r.autre || ''} onInput={e => maj({ ...r, autre: e.currentTarget.value })} />
      )}
      {q.type === 'aliments' && <ChoixAliments q={q} r={r} toutes={toutes} maj={maj} />}
      {q.type === 'nombre' && (q.saisie ? <Saisie q={q} r={r} maj={maj} /> : <Compteur q={q} r={r} maj={maj} />)}
      {q.type === 'roulette' && <Roulette q={q} r={r} maj={maj} />}
      {q.type === 'echelle' && (
        <>
          <div class="qc-echelle">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button type="button" class={+r.valeur === n ? 'on' : ''} aria-pressed={+r.valeur === n} onClick={() => maj({ ...r, valeur: n })}>{n}</button>
            ))}
          </div>
          <div class="qc-echelle-leg"><span>{q.bas}</span><span>{q.haut}</span></div>
        </>
      )}
      {q.type === 'date' && <input class="qc-champ" type="date" value={r.valeur || ''} onInput={e => maj({ ...r, valeur: e.currentTarget.value })} />}
      {q.type === 'texte' && (
        <input class="qc-champ" type={q.clavier === 'email' ? 'email' : q.clavier === 'tel' ? 'tel' : 'text'}
          placeholder={q.exemple || ''} value={r.valeur || ''} onInput={e => maj({ ...r, valeur: e.currentTarget.value })} />
      )}
      {q.type === 'long' && (
        <textarea class="qc-champ" rows={3} placeholder={q.exemple || ''} value={r.valeur || ''} onInput={e => maj({ ...r, valeur: e.currentTarget.value })} />
      )}
      {q.id === 'reaction' && allergieGrave(toutes) && (
        <div class="qc-alerte-rouge"><Icone nom="shield-check" taille={16} /><span>Gonflement ou malaise&nbsp;: cet aliment sera exclu à 100 % de ton plan, sans substitut risqué.</span></div>
      )}
      {erreur && <p class="qc-err">Réponds à cette question pour continuer.</p>}
    </div>
  );
}

// ---------- Questionnaire ----------

export function QuestionnaireCoach({ type, onFermer, onTermine }) {
  const sections = type === 'maj' ? MISE_A_JOUR : PREMIER_PLAN;
  const b = lireBrouillon(type);
  const [rep, setRep] = useState(() => (b && b.rep) || prerempli(type));
  const [i, setI] = useState(() => (b && Math.min(b.i || 0, sections.length)) || 0);
  const [vue, setVue] = useState('accueil');            // accueil | recap
  // Liste des sections avec la section en cours deja ouverte dedans
  // (maquette validee 27/09) : plus d'ecran separe par section.
  const [ouverte, setOuverte] = useState(() => { const d = (b && Math.min(b.i || 0, sections.length)) || 0; return d >= sections.length ? -1 : d; });
  const [consent, setConsent] = useState(() => (b && b.consent) || {});
  const [erreurs, setErreurs] = useState({});
  const [etatSauve, setEtatSauve] = useState('ok');     // ok | envoi | local
  const minuteur = useRef(null);
  const premier = useRef(true);
  const touche = useRef(false);
  useRetour(true, () => { if (vue === 'accueil') onFermer(); else setVue('accueil'); });

  // Sauvegarde : appareil tout de suite, Firestore apres une pause.
  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    const bb = { rep, i, consent, majLe: new Date().toISOString() };
    try { localStorage.setItem(cleBrouillon(type), JSON.stringify(bb)); } catch (e) { /* Firestore prend le relais */ }
    setEtatSauve('envoi');
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      sauverAvecDelai(type, bb).then(ok => setEtatSauve(ok ? 'ok' : 'local')).catch(() => setEtatSauve('local'));
    }, 1000);
    return () => clearTimeout(minuteur.current);
  }, [rep, i, consent]);

  // Brouillon Firestore arrive apres l'ouverture (2e appareil).
  const distant = dossierCoach.value.brouillon;
  const ouvertLe = useRef((b && b.majLe) || '');
  useEffect(() => {
    if (touche.current || !distant || distant.type !== type || !distant.rep) return;
    if ((distant.majLe || '') <= ouvertLe.current) return;
    ouvertLe.current = distant.majLe;
    const d = Math.min(distant.i || 0, sections.length);
    setRep(distant.rep); setI(d); setOuverte(d >= sections.length ? -1 : d); setConsent(distant.consent || {});
  }, [distant]);

  // Section ouverte plus bas que la premiere : on l'amene en haut.
  useEffect(() => {
    try {
      const el = vue === 'accueil' && ouverte > 0 ? document.querySelector('.pg-qc .qc-bloc') : document.querySelector('.pg-qc');
      if (el) el.scrollIntoView({ block: 'start' });
    } catch (e) { /* rien */ }
  }, [vue, ouverte]);

  const maj = id => v => { touche.current = true; setRep(r => ({ ...r, [id]: v })); setErreurs(x => ({ ...x, [id]: false })); };
  const visibles = s => s.questions.filter(q => !q.si || q.si(rep));
  const complete = s => visibles(s).every(q => repondue(q, rep[q.id], rep));
  const ouvrir = k => { setErreurs({}); setOuverte(k); if (vue !== 'accueil') setVue('accueil'); };
  const valider = k => {
    const manque = {};
    visibles(sections[k]).forEach(q => { if (!repondue(q, rep[q.id], rep)) manque[q.id] = true; });
    if (Object.keys(manque).length) { setErreurs(manque); return; }
    setErreurs({});
    const n = k + 1;
    setI(x => Math.max(x, n));
    if (n >= sections.length) { setOuverte(-1); setVue('recap'); } else setOuverte(n);
  };
  const nettoyer = () => {
    const out = {};
    sections.forEach(s => visibles(s).forEach(q => { if (rep[q.id]) out[q.id] = { ...rep[q.id], texte: lisible(q, rep[q.id]), section: s.nom, question: q.label }; }));
    return out;
  };
  const Sauve = () => (
    <span class={'qc-sauve qc-sauve--' + etatSauve}>
      {etatSauve === 'ok' && <Icone nom="cloud-check" taille={15} />}
      {etatSauve === 'envoi' ? 'Enregistrement…' : etatSauve === 'local' ? 'Gardé sur ce téléphone' : 'Enregistré'}
    </span>
  );
  const Segments = ({ jusque }) => (
    <div class="qc-seg">{sections.map((s, k) => <i class={k < jusque ? 'f' : k === jusque ? 'c' : ''} />)}</div>
  );

  // ----- Accueil : les sections, celle en cours ouverte -----
  if (vue === 'accueil') {
    const courante = Math.min(i, sections.length - 1);
    const fini = i >= sections.length;
    return (
      <div class="pg-coach pg-qc">
        <Entete sansBandeau retour={onFermer} />
        <div class="qc-haut"><span class="qc-sur">{type === 'maj' ? 'MOIS SUIVANT' : 'PAIEMENT REÇU'}</span><Sauve /></div>
        <h1 class="qc-titre qc-titre--accueil">{type === 'maj' ? 'Ton bilan du mois' : 'Ton programme commence ici'}</h1>
        <div class="qc-carte qc-liste">
          {sections.map((s, k) => {
            const ok = k < i && complete(s);
            const Etat = () => ok ? <span class="qc-ok"><Icone nom="circle-check" taille={18} /></span>
              : k === courante && !fini && (i > 0 || touche.current || b) ? <span class="qc-encours">En cours</span> : null;
            if (k === ouverte) return (
              <div class="qc-bloc">
                <button type="button" class="qc-ligne qc-ligne--ouverte" onClick={() => setOuverte(-1)}>
                  <span class="qc-ic"><Icone nom={s.icone} taille={17} /></span>
                  <span class="qc-ligne-nom">{s.nom}{s.facultative && <em> · facultatif</em>}</span>
                  <span class="qc-chev"><Icone nom="chevron-up" taille={18} /></span>
                </button>
                <div class="qc-ouvert">
                  {visibles(s).map(q => <Question key={q.id} q={q} rep={rep[q.id]} toutes={rep} maj={maj(q.id)} erreur={erreurs[q.id]} />)}
                  {Object.values(erreurs).some(Boolean) && <p class="qc-err qc-err--bas">Il manque une réponse plus haut.</p>}
                  <button class="qc-cta qc-cta--noir" onClick={() => valider(k)}>{k === sections.length - 1 ? 'Voir le récapitulatif' : 'Continuer'}</button>
                  {s.facultative && <button class="qc-passer" onClick={() => { setErreurs({}); setI(sections.length); setOuverte(-1); setVue('recap'); }}>Passer cette section</button>}
                </div>
              </div>
            );
            return (
              <button type="button" class="qc-ligne" disabled={k > i} onClick={() => ouvrir(k)}>
                <span class="qc-ic"><Icone nom={s.icone} taille={17} /></span>
                <span class="qc-ligne-nom">{s.nom}{s.facultative && <em> · facultatif</em>}</span>
                <Etat />
              </button>
            );
          })}
        </div>
        {fini ? <button class="qc-cta" onClick={() => setVue('recap')}>Voir le récapitulatif</button>
          : ouverte < 0 && <button class="qc-cta" onClick={() => ouvrir(courante)}>Reprendre · {sections[courante].nom}</button>}
      </div>
    );
  }

  // ----- Recapitulatif + consentements K -----
  if (vue === 'recap') {
    const manqueK = CONSENTEMENTS.filter(c => c.requis && !consent[c.id]);
    return (
      <div class="pg-coach pg-qc">
        <Entete sansBandeau retour={() => ouvrir(sections.length - 1)} />
        <div class="qc-haut"><span>Récapitulatif</span><Sauve /></div>
        <Segments jusque={sections.length} />
        <p class="qc-sur">DERNIÈRE ÉTAPE</p>
        <h1 class="qc-titre">Tout est bon&nbsp;?</h1>
        <p class="qc-sous">Vérifie, puis envoie à ton coach.</p>
        {sections.map((s, k) => {
          const lignes = visibles(s).filter(q => rep[q.id] && lisible(q, rep[q.id]) !== '—');
          if (!lignes.length) return null;
          return (
            <div class="qc-carte qc-recap">
              <div class="qc-recap-tete">
                <span class="qc-ic"><Icone nom={s.icone} taille={17} /></span>
                <span class="qc-ligne-nom">{s.nom}</span>
                <button class="qc-modif" onClick={() => ouvrir(k)}>Modifier</button>
              </div>
              {lignes.map(q => <p class="qc-rl"><span>{q.label}</span><b>{lisible(q, rep[q.id])}</b></p>)}
            </div>
          );
        })}
        {alerteSante(rep) && <p class="qc-alerte">Tu as signalé un point de santé. Montre ton plan à ton médecin avant de le commencer.</p>}
        <div class="qc-carte">
          {CONSENTEMENTS.map(c => {
            const liens = (c.liens || []).filter(([, cle]) => LIENS_LEGAUX[cle]);
            return (
              <label class="qc-consent">
                <input type="checkbox" checked={!!consent[c.id]} onChange={e => { touche.current = true; setConsent(x => ({ ...x, [c.id]: e.currentTarget.checked })); }} />
                <span>{c.texte}
                  {liens.length > 0 && <span class="qc-liens">{liens.map(([nom, cle], n) => <>{n > 0 && ' · '}<a href={LIENS_LEGAUX[cle]} target="_blank" rel="noopener">{nom}</a></>)}</span>}
                </span>
              </label>
            );
          })}
        </div>
        <button class={'qc-cta' + (manqueK.length ? ' qc-cta--gris' : '')} disabled={manqueK.length > 0}
          onClick={() => { if (!manqueK.length) onTermine(nettoyer(), alerteSante(rep), { allergieGrave: allergieGrave(rep), consentements: consent }); }}>Envoyer à mon coach</button>
        <p class="qc-note">Tu recevras ton plan dans l'app et par e-mail.</p>
      </div>
    );
  }
  return null;
}
