// 25/11 Raci (maquette validee « Vendu ») : « Tu as quoi a portee de main ? »
// Feuille plein ecran ouverte depuis un repas du plan coach.
// Ecran 1 : choix des aliments (proteine obligatoire). Ecran 2 : repas recalcule.
import { useState, useMemo } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import '../styles/mes-aliments.css';
import { groupesPour, calculerRepas, pictoDe, detailLigne, totauxIngs } from '../services/mes-aliments.js';
import { appliquerIdee, choisirIdee } from '../store/journal.js';

export function MesAliments({ r, prefs, heure, fermer, apresChoix }) {
  const plan = r.idee ? (r.ingsPlan || []) : r.ings;   // meme cible que « Autre idee »
  const t = totauxIngs(plan);
  const cible = { kcal: Math.round(t.kcal), prot: Math.round(t.prot) };
  const creneau = r.cle || r.nom;
  const groupes = useMemo(() => groupesPour(creneau, prefs), [creneau, prefs]);
  const [choix, setChoix] = useState({ proteine: [], feculent: [], legumes: [] });
  const [res, setRes] = useState(null);
  const [alerte, setAlerte] = useState(false);
  const nomRepas = String(r.nom || 'repas').toLowerCase();
  const aProt = choix.proteine.length > 0;

  const basculer = (g, k) => {
    setAlerte(false);
    setChoix(c => ({ ...c, [g]: c[g].includes(k) ? c[g].filter(x => x !== k) : [...c[g], k] }));
  };
  const calculer = () => {
    if (!aProt) { setAlerte(true); return; }
    setRes(calculerRepas(choix, cible, creneau));
  };
  const garder = () => {
    appliquerIdee(r.id, { nom: 'Mon repas avec mes aliments', ings: res.ings, kcal: res.kcal, cible: cible.kcal });
    const out = choisirIdee(r.id);
    fermer();
    if (apresChoix) apresChoix(out);
  };
  const court = res && res.kcal < cible.kcal * 0.85;

  return createPortal(
    <div class="ma" role="dialog" aria-modal="true" aria-label="Tu as quoi à portée de main ?">
      <div class="ma-page">
        <div class="ma-haut">
          <button class="ma-retour" aria-label="Retour" onClick={() => res ? setRes(null) : fermer()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
          </button>
          {heure && <span class="ma-heure">{heure.replace(':', 'h')}</span>}
        </div>

        {!res ? (<>
          <h1 class="ma-titre">Tu as quoi à portée de main&nbsp;?</h1>
          <p class="ma-sous">On adapte ton {nomRepas} avec ce que tu as.</p>
          <div class="ma-cible">
            <div><small>À garder</small><b>{cible.kcal}</b> <i>kcal</i></div>
            <div class="ma-cible-d"><small>Protéines</small><b class="ma-vert">{cible.prot}</b><i class="ma-vert"> g</i></div>
          </div>
          {groupes.map(g => {
            const obl = g.cle === 'proteine';
            const etat = obl ? (aProt ? ' ma-carte--ok' : ' ma-carte--req') : '';
            return (
              <section class={'ma-carte' + etat} key={g.cle}>
                <div class="ma-lb">
                  <span>{g.titre}</span>
                  <em class={'ma-tag' + (obl ? (aProt ? ' ma-tag--ok' : ' ma-tag--req') : '')}>{obl && aProt ? '✓ Choisie' : g.statut}</em>
                </div>
                <div class="ma-chips">
                  {g.items.map(it => {
                    const on = choix[g.cle].includes(it.k);
                    return (
                      <button key={it.k} class={'ma-ch' + (on ? ' ma-ch--on' : '')} aria-pressed={on} onClick={() => basculer(g.cle, it.k)}>
                        <span class="ma-ic" aria-hidden="true">{it.e}</span>{it.l}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {alerte && <p class="ma-alerte" role="alert">Choisis au moins une protéine.</p>}
          <button class={'ma-bt' + (aProt ? ' ma-bt--noir' : ' ma-bt--off')} onClick={calculer}>
            {aProt ? 'Calculer mon repas' : 'Choisis une protéine'}
          </button>
          <button class="ma-lien" onClick={fermer}>Revenir au repas prévu</button>
        </>) : (<>
          <h1 class="ma-titre">Ton nouveau {nomRepas}</h1>
          <p class="ma-sous">Même objectif, avec ce que tu as.</p>
          <div class="ma-cible">
            <div><small>Total</small><b>{res.kcal}</b> <i>kcal</i></div>
            <div class="ma-cible-d"><small>Protéines</small><b class="ma-vert">{res.prot}</b><i class="ma-vert"> g</i></div>
          </div>
          <div class="ma-carte ma-carte--ok ma-res">
            {res.ings.map(i => {
              const d = detailLigne(i);
              return (
                <div class="ma-ligne" key={i.name}>
                  <span class="ma-ic-g" aria-hidden="true">{pictoDe(i.name)}</span>
                  <span class="ma-n">{d.nom}</span>
                  <span class="ma-q">{d.qte}<span class="ma-u"> g</span></span>
                </div>
              );
            })}
          </div>
          <div class="ma-tot"><span>Glucides {res.carbs} g</span><span>Lipides {res.lip} g</span></div>
          {court && <p class="ma-note">Ce repas fait {res.kcal} kcal au lieu de {cible.kcal}. Ajoute un féculent pour t'en rapprocher.</p>}
          <button class="ma-bt ma-bt--vert" onClick={garder}>Garder ce repas</button>
          <button class="ma-lien" onClick={() => setRes(null)}>Changer mes aliments</button>
        </>)}
      </div>
    </div>,
    document.body
  );
}
