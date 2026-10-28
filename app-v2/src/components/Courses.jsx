import { useState } from 'preact/hooks';
import { signal, effect, computed } from '@preact/signals';
import { rayonDe, RAYONS } from '../data/rayons.js';
import { DB, NOMS_ALIMENTS } from '../data/aliments.js';
import { limitesPortion } from '../data/portions.js';
import { repas } from '../store/journal.js';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { t } from '../i18n/index.js';
import { allerOnglet } from './BottomNav.jsx';
import { ecritureBloquee } from '../store/acces-nutrition.js';

// ============================================================
// MES COURSES
// La liste se construit depuis les repas du journal, multipliee
// par le nombre de jours et de personnes, puis triee par rayon
// pour suivre le parcours en magasin.
//
// Les cases cochees et les articles ajoutes a la main survivent a
// une nouvelle generation : perdre sa progression au milieu d'un
// magasin serait insupportable.
// ============================================================

const CHOIX_JOURS = [3, 5, 7];
const CHOIX_PERS = [1, 2, 3, 4];
const DEFAUT = { jours: 5, pers: 1, coches: {}, manuels: [], notes: {}, genere: false };

export const courses = signal({ ...DEFAUT });
/** Onglet d'ou l'on a ouvert les courses : le retour y ramene (23/09).
 *  Ouvertes depuis BelFit+, la fleche renvoyait au Journal. */
export const origineCourses = signal('journal');

let uid = null, pret = false;

effect(() => {
  const u = identite.value;
  if (!u) { pret = false; return; }
  if (u === uid && pret) return;
  uid = u; pret = false;
  chargerDonnees(u).then(d => {
    if (uid !== u) return;
    courses.value = (d && d.courses) || { ...DEFAUT };
    pret = true;
  });
});

effect(() => {
  const c = courses.value;
  const u = identite.value;
  if (!u || !pret) return;
  sauvegarder(u, { courses: c });
});

/** Nom affiche en magasin : sans mention de cuisson ni precision technique. */
function nomCourse(nom) {
  return nom
    .replace(/\s*\((cuit|cuite|cru|crue)[^)]*\)/gi, '')
    .replace(/\s+(cuit|cuite|cuits|cuites|cru|crue|crus)\b/gi, '')
    .trim();
}

/** Quantites d'une journee type, tous repas confondus. */
const baseJournee = computed(() => {
  const totaux = {};
  repas.value.forEach(r => {
    (r.ings || []).forEach(i => {
      const nom = nomCourse(i.name);
      if (!totaux[nom]) totaux[nom] = { qty: 0, ref: i.name };
      // La portion d'un aliment a l'unite compte des PIECES : on la
      // ramene en grammes avant de cumuler, l'affichage reconvertit.
      const du = DB[i.name];
      totaux[nom].qty += (du && du.unit) ? (i.portion || 0) * du.unit : (i.portion || 0);
    });
  });
  return Object.entries(totaux).map(([nom, v]) => {
    const d = DB[v.ref];
    return {
      nom,
      qty: v.qty,
      parUnite: d && d.unit ? d.unit : null,
      unite: d && d.unitLabel ? d.unitLabel : 'u',
      cat: rayonDe(v.ref),
    };
  });
});

export function Courses() {
  const c = courses.value;
  const [ajout, setAjout] = useState('');
  const [menu, setMenu] = useState(false);
  const [noteOuverte, setNoteOuverte] = useState(null);   // nom de l'article
  const [noteTexte, setNoteTexte] = useState('');

  // Suggestions depuis la base : recherche par mots, comme partout
  // ailleurs dans l'app. « riz cru » trouve « Riz basmati cru ».
  const q = ajout.trim().toLowerCase();
  const suggestions = q.length < 2 ? [] : (() => {
    const mots = q.split(/\s+/);
    return NOMS_ALIMENTS
      .filter(n => { const b = n.toLowerCase(); return mots.every(m => b.includes(m)); })
      .slice(0, 8);
  })();

  /** Quantite proposee pour un aliment ajoute a la main.
   *  Une liste de courses n'achete pas une portion mais de quoi
   *  tenir : on prend la portion type de la famille (milieu des
   *  bornes, arrondi au pas) et on la multiplie par les jours et les
   *  personnes — exactement la regle appliquee aux articles issus du
   *  journal. Hors base (papier toilette), aucune quantite : elle
   *  n'aurait aucun sens. */
  const qtePourAchat = (nom) => {
    const d = DB[nom];
    if (!d) return null;
    const l = limitesPortion(nom);
    const milieu = (l.min + l.max) / 2;
    const type = Math.round(milieu / l.step) * l.step;
    const brut = type * c.jours * c.pers;
    return d.unit ? brut * d.unit : brut;   // les pieces se comptent en grammes
  };

  const ajouterDepuisBase = (nom) => {
    if (!c.manuels.some(m => (typeof m === 'string' ? m : m.nom) === nom)) {
      maj({ manuels: [...c.manuels, { nom, qty: qtePourAchat(nom) }] });
    }
    setAjout('');
  };

  const poserNote = (nom, texte) => {
    const n = { ...(c.notes || {}) };
    const v = texte.trim();
    if (v) n[nom] = v.slice(0, 40); else delete n[nom];
    maj({ notes: n });
    setNoteOuverte(null); setNoteTexte('');
  };
  const base = baseJournee.value;

  const maj = (o) => { if (ecritureBloquee()) return; courses.value = { ...courses.value, ...o }; };

  const generer = () => maj({ genere: true });

  const cocher = (nom) => {
    const coches = { ...c.coches };
    if (coches[nom]) delete coches[nom]; else coches[nom] = true;
    maj({ coches });
  };

  const retirer = (nom) => {
    maj({
      manuels: c.manuels.filter(m => m !== nom),
      retires: [...(c.retires || []), nom],
    });
  };

  /** Ajout au clavier : n'accepte QUE des aliments de la base. Une
   *  liste de courses pour les repas n'a pas a contenir autre chose,
   *  et un nom hors base arriverait sans quantite ni rayon. Si la
   *  saisie correspond exactement a un aliment, on l'ajoute ; sinon
   *  on laisse les suggestions faire leur travail. */
  const ajouterManuel = (e) => {
    e.preventDefault();
    const v = ajout.trim();
    if (!v) return;
    const exact = NOMS_ALIMENTS.find(n => n.toLowerCase() === v.toLowerCase());
    if (exact) { ajouterDepuisBase(exact); return; }
    const seule = suggestions.length === 1 ? suggestions[0] : null;
    if (seule) ajouterDepuisBase(seule);
  };

  // Articles issus du journal, multiplies, moins ceux retires.
  const retires = c.retires || [];
  const duJournal = c.genere
    ? base
        .filter(i => !retires.includes(i.nom))
        .map(i => ({ ...i, qty: i.qty * c.jours * c.pers }))
    : [];

  // Les articles manuels ont pu etre enregistres en simple chaine par
  // une version anterieure : les deux formes sont acceptees.
  const manuels = c.manuels
    .map(m => (typeof m === 'string' ? { nom: m, qty: null } : m))
    .filter(m => !retires.includes(m.nom))
    .map(m => {
      const d = DB[m.nom];
      return {
        nom: m.nom, qty: m.qty != null ? m.qty : null,
        parUnite: d && d.unit ? d.unit : null,
        unite: d && d.unitLabel ? d.unitLabel : 'u',
        cat: rayonDe(m.nom),
      };
    });

  const tous = [...duJournal, ...manuels];

  // Articles qu'il reste a prendre : le compteur au-dessus de la liste.
  const restants = tous.filter(i => !c.coches[i.nom]).length;

  const parRayon = RAYONS
    .map(r => ({ ...r, liste: tous.filter(i => i.cat === r.k) }))
    .filter(r => r.liste.length);

  const partager = async () => {
    const lignes = [t('co_share_title'), ''];
    parRayon.forEach(r => {
      const dedans = r.liste.filter(i => !c.coches[i.nom]);
      if (!dedans.length) return;
      lignes.push(r.emo + ' ' + t('ray_' + r.k).toUpperCase());
      dedans.forEach(i => lignes.push('  • ' + i.nom + (i.qty ? ' — ' + quantite(i) : '')));
      lignes.push('');
    });
    const texte = lignes.join('\n');
    try {
      if (navigator.share) await navigator.share({ text: texte });
      else await navigator.clipboard.writeText(texte);
    } catch (err) { /* partage annule */ }
  };

  return (
    <div class="crs">
      {/* En-tete : titre centre entre deux boutons ronds, d'apres la
          maquette mesuree (bouton 36 pt, titre 20 pt). */}
      <div class="crs-barre">
        <button class="crs-rond" onClick={() => allerOnglet(origineCourses.value || 'journal')} aria-label="Retour">
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h2>{t('co_title')}</h2>
        <button class="crs-rond" onClick={() => setMenu(v => !v)} aria-label="Options">
          <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
        </button>
      </div>

      {/* Carte de preparation : bandeau illustre, puis les deux
          reglages, puis le bouton de generation. */}
      <div class="crs-prep">
        <div class="crs-hero">
          <span class="crs-hero-photo" aria-hidden="true" />
          <span class="crs-hero-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7z" /><path d="M9 8V6a3 3 0 016 0v2" /></svg>
          </span>
          <h3>Tes courses<br />intelligentes</h3>
          <p>Générées automatiquement<br />à partir de tes repas.</p>
          <p class="crs-hero-tag">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.7 5.3H19l-4.3 3.2 1.6 5.2L12 13.4 7.7 16.7l1.6-5.2L5 8.3h5.3z" /></svg>
            100% adaptées à ton plan
          </p>
        </div>

        <div class="crs-reglage">
          <p class="crs-q">{t('co_days_q')}</p>
          <div class="crs-seg crs-seg--jours">
            {CHOIX_JOURS.map(n => (
              <button key={n} class={c.jours === n ? 'on' : ''} onClick={() => maj({ jours: n })}>
                {n} {t('jours_court')}
              </button>
            ))}
          </div>

          <p class="crs-q">{t('co_people_q')}</p>
          <div class="crs-seg crs-seg--pers">
            {CHOIX_PERS.map(n => (
              <button key={n} class={c.pers === n ? 'on' : ''} onClick={() => maj({ pers: n })}>
                {n === 4 ? '4+' : n}
              </button>
            ))}
          </div>

          <button class="crs-generer" disabled={!base.length} onClick={generer}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.7 5.3H19l-4.3 3.2 1.6 5.2L12 13.4 7.7 16.7l1.6-5.2L5 8.3h5.3z" /></svg>
            {t('co_generate')}
          </button>
          {!base.length && <p class="crs-note">{t('co_note_vide')}</p>}
        </div>
      </div>

      {/* Ajout : la base des 1048 aliments se propose des deux
          premieres lettres, mais le texte libre reste accepte — on
          met aussi du papier toilette dans un caddie. */}
      <div class="crs-ajout-zone">
        <form class="crs-ajout" onSubmit={ajouterManuel}>
          <svg class="crs-loupe" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
          </svg>
          <input
            placeholder={t('co_add_ph')}
            value={ajout}
            onInput={e => setAjout(e.currentTarget.value)}
          />
          <button type="submit" aria-label="Ajouter">＋</button>
        </form>

        {suggestions.length > 0 && (
          <div class="crs-suggestions">
            {suggestions.map(n => (
              <button
                key={n}
                /* onPointerDown et non onClick : au doigt, le premier
                   appui fait perdre le focus au champ, le clavier se
                   referme et la mise en page remonte — le bouton
                   glisse alors sous le doigt et le clic tombe a cote.
                   preventDefault empeche cette perte de focus. */
                onPointerDown={(e) => { e.preventDefault(); ajouterDepuisBase(n); }}
                onClick={(e) => e.preventDefault()}
              >
                <span>{n}</span>
                <em>{qteLisible(qtePourAchat(n), DB[n])}</em>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Liste par rayon */}
      {tous.length > 0 && (
        <div class="crs-compte">
          {restants > 0
            ? t('co_restants').replace('{n}', restants)
            : t('co_complete')}
        </div>
      )}

      {parRayon.map(r => (
        <div class="crs-rayon" key={r.k}>
          <div class="crs-rayon-tete">
            <span class="crs-emo">{r.emo}</span>
            <span>{t('ray_' + r.k)}</span>
            <i class="crs-nb">{r.liste.filter(i => !c.coches[i.nom]).length}/{r.liste.length}</i>
          </div>
          <div class="crs-carte">
            {r.liste.map(i => {
              const coche = !!c.coches[i.nom];
              return (
                <div class="crs-item-bloc" key={i.nom}>
                <div class={'crs-item' + (coche ? ' fait' : '')}>
                  <button class="crs-check" onClick={() => cocher(i.nom)} aria-label="Cocher">
                    {coche ? '✓' : ''}
                  </button>
                  <div class="crs-body" onClick={() => cocher(i.nom)}>
                    <div class="crs-nom">{i.nom}</div>
                    <div class="crs-meta">
                      {i.qty != null && <span class="crs-qty">{quantite(i)}</span>}
                      {(c.notes || {})[i.nom] && (
                        <span class="crs-note-tag">{c.notes[i.nom]}</span>
                      )}
                    </div>
                  </div>
                  {/* Note libre : ou acheter cet article. Un magasin,
                      un rayon, une marque — c'est au client de dire. */}
                  <button
                    class="crs-note-btn"
                    aria-label="Note"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNoteOuverte(noteOuverte === i.nom ? null : i.nom);
                      setNoteTexte((c.notes || {})[i.nom] || '');
                    }}
                  >
                    <svg viewBox="0 0 24 24"><path d="M4 20l4.5-1.2L19 8.3a2 2 0 000-2.8l-.5-.5a2 2 0 00-2.8 0L5.2 15.5z" /></svg>
                  </button>
                  <button class="crs-del" onClick={() => retirer(i.nom)} aria-label="Retirer">✕</button>
                </div>
                {noteOuverte === i.nom && (
                  <div class="crs-note-champ">
                    <input
                      autoFocus
                      maxLength={40}
                      placeholder="Colruyt, boucherie, marque…"
                      value={noteTexte}
                      onInput={(e) => setNoteTexte(e.currentTarget.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') poserNote(i.nom, noteTexte); }}
                    />
                    <button onClick={() => poserNote(i.nom, noteTexte)}>OK</button>
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Liste vide : le message monte au centre, sous les reglages,
          au lieu d'attendre une ligne perdue en bas de page. */}
      {!tous.length && (
        <div class="crs-vide">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h16l-1.4 11.2a2 2 0 01-2 1.8H7.4a2 2 0 01-2-1.8z" />
            <path d="M8.5 8V6.2a3.5 3.5 0 017 0V8" />
            <path d="M9.5 12v5M14.5 12v5" />
          </svg>
          <b>Ta liste est vide</b>
          <span>Génère ta liste ou ajoute des produits pour commencer.</span>
        </div>
      )}

      {tous.length > 0 && (
        <div class="crs-actions">
          <button class="crs-partager" onClick={partager}>
            <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
              <path d="M12 3v13" /><path d="M7.5 7.5L12 3l4.5 4.5" />
              <path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            {t('co_share_btn')}
          </button>
          <button class="crs-decocher" onClick={() => maj({ coches: {} })}>
            {t('co_uncheck')}
          </button>
        </div>
      )}
    </div>
  );
}

/** Quantite lisible hors ligne de liste : sert aux suggestions. */
function qteLisible(q, d) {
  if (q == null) return '';
  if (d && d.unit) {
    const n = Math.ceil(q / d.unit);
    return n + ' ' + (d.unitLabel || 'u') + (n > 1 ? 's' : '');
  }
  return q >= 1000
    ? (q / 1000).toFixed(1).replace('.', ',') + ' kg'
    : Math.round(q) + ' g';
}

/** Quantite lisible : kilos au-dela de 1000 g, unites si l'aliment se compte. */
function quantite(i) {
  if (i.qty == null) return '';
  if (i.parUnite) {
    const n = Math.ceil(i.qty / i.parUnite);
    return n + ' ' + i.unite + (n > 1 ? 's' : '');
  }
  return i.qty >= 1000
    ? (i.qty / 1000).toFixed(1).replace('.', ',') + ' kg'
    : Math.round(i.qty) + ' g';
}
