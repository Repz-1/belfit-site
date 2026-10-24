import { useState, useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { DB, NOMS_ALIMENTS, macrosOf, scoreRecherche, facteurCuisson, PAIRES_CUISSON } from '../data/aliments.js';
import { customFoods, Scanner } from './Scanner.jsx';
import { VocalModal } from './VocalModal.jsx';
import { PhotoModal } from './PhotoModal.jsx';
import { signal, effect } from '@preact/signals';

// Ouverture de la bibliotheque de plats. Elle a quitte les actions
// rapides : on n'y va que pour renommer ou supprimer un plat, ce qui
// est rare. Le lien vit donc au bas de la liste de recherche, la ou
// les plats apparaissent deja.
export const ouvrirMesPlats = signal(false);

// Repas ouvert en pleine page (null = aucune). Toucher une carte du
// Journal ouvre la page d'encodage plein ecran (MealPage) : le clavier
// et la liste de resultats y disposent de tout l'ecran.
export const repasOuvertId = signal(null);

// 22/10 Raci : « Mangé autre chose » ouvre la page du repas vide. Si le
// client la quitte sans rien noter ni toucher « Terminer », le repas
// redevient le prevu du plan (rien n'est perdu, rien n'est invente).
let ouvertAvant = null;
effect(() => {
  const id = repasOuvertId.value;
  const prec = ouvertAvant; ouvertAvant = id;
  if (prec === null || prec === id) return;
  const r = repas.peek().find(x => x.id === prec);
  if (r && r.remplace && r.prevu) remettrePrevu(prec);
});

// Ligne tout juste ajoutee : elle prend le focus sur son grammage.
// Choisir un aliment et devoir ensuite aller chercher son champ de
// quantite est un aller-retour de trop — l'un appelle l'autre.
export const ingNouveau = signal(null);
import { estPremium } from './PremiumPage.jsx';
import { ongletActif } from './BottomNav.jsx';
import { t } from '../i18n/index.js';
import {
  favoris, estFavori, basculerFavori,
  alimentsCourants, bonusUsage, noterUsage, plats, macrosPortion,
} from '../store/perso.js';
import { MEAL_SVG, TYPE_SVG, MEAL_NEUTRAL_SVG } from '../data/illustrations.js';
import {
  repas, totauxRepas, setPortion, ajouterIngredient, ajouterPlat,
  supprimerIngredient, supprimerRepas, renommerRepas, basculerCuisson,
  fourchetteRepas, remplacerAliment, validerRepas, annulerValidation, sauterRepas, mangeAutreChose, remettrePrevu } from '../store/journal.js';

/** Illustration d'un repas : la sienne s'il est fixe, sinon celle de son type. */
export function illustration(r) {
  if (r.cle && MEAL_SVG[r.cle]) return MEAL_SVG[r.cle];
  return TYPE_SVG[r.type] || MEAL_NEUTRAL_SVG;
}


/** Combien de portions de ce plat ? Un seul chiffre a regler. */
export function ChoixPortions({ plat, fermer, valider }) {
  const [n, setN] = useState(1);
  const part = macrosPortion(plat);

  return createPortal(
    <div class="cp-overlay" onClick={e => { if (e.target === e.currentTarget) fermer(); }}>
      <div class="cp-boite">
        <h3>{plat.nom}</h3>
        <p class="cp-sous">{t('cp_combien')}</p>

        <div class="cp-compteur">
          <button onClick={() => setN(Math.max(0.5, Math.round((n - 0.5) * 2) / 2))}>−</button>
          <span>{n % 1 === 0 ? n : n.toFixed(1).replace('.', ',')}</span>
          <button onClick={() => setN(n + 0.5)}>+</button>
        </div>

        <div class="cp-total">
          {Math.round(part.kcal * n)} kcal · {Math.round(part.prot * n)} g prot
        </div>

        <button class="cp-valider" onClick={() => valider(n)}>{t('cp_ajouter')}</button>
      </div>
    </div>,
    document.body
  );
}


// ============================================================
// VIGNETTE D'ALIMENT
// Photo generee par IA, servie depuis /img/aliments/<slug>.webp.
// Tant qu'une image manque, la pastille neutre reste affichee :
// l'app fonctionne avec 0 comme avec 1048 images.
// ============================================================
export function slugAliment(nom) {
  return String(nom || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ImageAliment({ nom }) {
  const [absente, setAbsente] = useState(false);
  if (absente) return <span class="mc-ing-vignette mc-ing-vignette--vide" />;
  return (
    <img
      class="mc-ing-vignette"
      src={'/img/aliments/' + slugAliment(nom) + '.webp'}
      alt="" loading="lazy" decoding="async"
      onError={() => setAbsente(true)}
    />
  );
}

export function LigneIngredient({ repasId, ing }) {
  const d = DB[ing.name] || customFoods.value[ing.name] || {};
  const m = macrosOf(ing);
  const [saisie, setSaisie] = useState(String(ing.portion));
  const champQte = useRef(null);
  // Pas de bascule cru/cuit sur un aliment compte a la piece : un oeuf
  // reste un oeuf. Sinon, null si la bascule n'a pas de sens.
  const fc = d.unit ? null : facteurCuisson(ing.name);
  // Aliment dont le nom porte deja la cuisson : la bascule existe
  // quand meme, elle change d'entree au lieu de convertir.
  const paire = fc ? null : PAIRES_CUISSON[ing.name];

  // La valeur peut changer ailleurs (vocal, scan) : on resynchronise.
  useEffect(() => { setSaisie(String(ing.portion)); }, [ing.portion]);

  // Aliment vise : on enchaine sur sa quantite, deja selectionnee —
  // taper le chiffre remplace la valeur.
  // Le signal est lu ICI, dans le corps du composant, et non dans
  // l'effet : sinon la ligne ne reagit qu'a sa propre creation. Une
  // ligne DEJA montee — celle qu'on vise quand l'aliment est deja
  // encode — ne voyait jamais passer le signal, son effet n'ayant
  // que [ing.id] en dependance et cet id ne changeant pas.
  const vise = ingNouveau.value === ing.id;
  useEffect(() => {
    if (!vise) return;
    ingNouveau.value = null;
    const n = champQte.current;
    if (!n) return;
    requestAnimationFrame(() => {
      n.focus({ preventScroll: true });
      n.select();
      n.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [vise]);

  return (
    <div class="mc-ing">
      <div class="mc-ing-info">
        <div class="mc-ing-nom">{ing.name}</div>
        <div class="mc-ing-base">
          {d.unit
            ? `1 ${d.unitLabel || 'pièce'} = ${Math.round((d.kcal || 0) * d.unit / 100)} kcal`
            : `100g = ${d.kcal ?? '?'} kcal`}
        </div>

        {/* Cru ou cuit : les valeurs d'etiquette valent pour le produit
            cru, alors qu'on pese le plus souvent apres cuisson. */}
        {fc && (
          <button
            class={'mc-ing-cuisson' + (ing.cuit ? ' est-cuit' : '')}
            onClick={() => basculerCuisson(repasId, ing.id)}
          >
            <span class={ing.cuit ? '' : 'actif'}>cru</span>
            <span class={ing.cuit ? 'actif' : ''}>cuit</span>
          </button>
        )}
        {paire && (
          <button
            class={'mc-ing-cuisson' + (paire.cuit ? ' est-cuit' : '')}
            onClick={() => remplacerAliment(repasId, ing.id, paire.autre)}
          >
            <span class={paire.cuit ? '' : 'actif'}>cru</span>
            <span class={paire.cuit ? 'actif' : ''}>cuit</span>
          </button>
        )}
      </div>

      <div class="mc-ing-champ">
        <input
          ref={champQte}
          type="number" inputMode="decimal" min="0"
          value={saisie}
          onFocus={e => e.currentTarget.select()}
          onInput={e => {
            const v = e.currentTarget.value;
            setSaisie(v);                       // champ vide autorise pendant la frappe
            if (v !== '') setPortion(repasId, ing.id, v);
          }}
          onBlur={() => {
            if (saisie === '') { setSaisie('0'); setPortion(repasId, ing.id, 0); }
          }}
        />
      </div>
      <span class="mc-ing-unite">{d.unit ? (d.unitLabel || 'pièce') : 'g'}</span>

      <div class="mc-ing-macros">
        <div class="mc-ing-kcal">{m.kcal.toFixed(0)} kcal</div>
        <div class="mc-ing-sub">
          {m.prot.toFixed(0)}P·{m.carbs.toFixed(0)}C·{m.lip.toFixed(0)}L
        </div>
      </div>

      <button class="mc-ing-del" onClick={() => supprimerIngredient(repasId, ing.id)} aria-label="Retirer">✕</button>
    </div>
  );
}

export function Recherche({ repasId, phCourt }) {
  const [iaVocal, setIaVocal] = useState(false);
  const [iaPhoto, setIaPhoto] = useState(false);
  const champRef = useRef(null);
  const zoneRef = useRef(null);
  const [q, setQ] = useState('');
  const [scan, setScan] = useState(false);
  const [platChoisi, setPlatChoisi] = useState(null);
  // La liste ne s'affiche que si le champ est actif : sans cela, vider
  // la saisie apres un choix rouvrait aussitot la liste des favoris.
  const [actif, setActif] = useState(false);
  const noms = [...Object.keys(customFoods.value), ...NOMS_ALIMENTS];
  const terme = q.trim().toLowerCase();

  // Les plats enregistres passent avant les aliments : ils sont plus
  // specifiques et c'est souvent eux qu'on cherche.
  const platsTrouves = terme.length >= 2
    ? plats.value
        .map(p => [scoreRecherche(terme, p.nom), p])
        .filter(([sc]) => sc > 0)
        .sort((a, b) => b[0] - a[0])
        .slice(0, 4)
        .map(([, p]) => p)
    : [];

  // Le classement tient compte de ce que la personne encode vraiment :
  // a pertinence egale, l'aliment le plus souvent choisi passe devant.
  const classer = (liste) => liste
    .map(n => [scoreRecherche(terme, n), n])
    .filter(([sc]) => sc > 0)
    .map(([sc, n]) => [sc + bonusUsage(n), n])
    .sort((a, b) => b[0] - a[0]);

  // Un favori dont l'aliment n'existe plus — produit renomme dans la
  // base, aliment scanne puis supprime — n'a plus de valeurs. La
  // branche « sans saisie » l'ecartait deja ; celle avec saisie ne le
  // faisait pas, et la page plantait sur `.kcal` d'un objet absent.
  // Trouve le 10/08 en instrumentant la console.
  const aDesValeurs = (n) => !!(DB[n] || customFoods.value[n]);

  // Sans saisie, deux listes separees et titrees. Les favoris
  // d'abord — un choix explicite prime sur une statistique — puis
  // les aliments les plus encodes, dont on retire ce qui est deja
  // epingle pour ne pas afficher deux fois la meme ligne.
  const favVus = favoris.value.filter(aDesValeurs).slice(0, 5);
  const courants = alimentsCourants(10)
    .filter(n => !estFavori(n))
    .filter(aDesValeurs)
    .slice(0, Math.max(2, 6 - favVus.length));

  const resultats = terme.length < 2
    ? []
    : classer(noms).map(([, n]) => n).slice(0, 8).filter(aDesValeurs);

  // Une bascule de favori doit se VOIR. C'est le silence de l'ancienne
  // etoile qui posait probleme : elle vivait a 42 px du nom qu'on tape
  // pour choisir un aliment, elle basculait sans qu'on le veuille et
  // rien ne le disait. Ici, chaque bascule affiche une bande avec le
  // nom de l'aliment et une annulation d'un seul geste.
  const [avis, setAvis] = useState(null);   // { nom, ajoute }
  const minuteurAvis = useRef(null);

  const annoncer = (nom) => {
    const ajoute = estFavori(nom);
    setAvis({ nom, ajoute });
    clearTimeout(minuteurAvis.current);
    minuteurAvis.current = setTimeout(() => setAvis(null), 4000);
  };
  useEffect(() => () => clearTimeout(minuteurAvis.current), []);

  const basculer = (nom) => { basculerFavori(nom); annoncer(nom); };

  const ligneResultat = (nom) => {
    const dd = DB[nom] || customFoods.value[nom];
    const fav = estFavori(nom);
    return (
      <div class="mc-res-ligne" key={nom}>
        <button class="mc-res-choix" onClick={() => choisir(nom)}>
          <span>{nom}</span>
          <span class="kc">{dd.kcal} kcal/100g</span>
        </button>
        <button
          class={'mc-res-fav' + (fav ? ' on' : '')}
          onClick={e => { e.stopPropagation(); basculer(nom); }}
          aria-label={fav ? t('fav_retirer') : t('fav_basculer')}
          aria-pressed={fav ? 'true' : 'false'}
        >{fav ? '★' : '☆'}</button>
      </div>
    );
  };

  const listeVide = terme.length < 2
    ? favVus.length === 0 && courants.length === 0
    : resultats.length === 0;

  // Aliments deja encodes dans CE repas, par nom. Sert a rediriger
  // l'appui au lieu d'ajouter une seconde fois la meme chose.
  const dejaLa = new Map();
  for (const i of (repas.value.find(r => r.id === repasId)?.ings || [])) {
    if (!dejaLa.has(i.name)) dejaLa.set(i.name, i);
  }

  const choisir = (nom) => {
    // Deja dans ce repas : on ne duplique pas, on emmene sur la ligne
    // existante, quantite selectionnee. Silencieux, et c'est voulu :
    // appuyer puis ajuster est la regle pour TOUS les aliments, la
    // marque « deja dans ce repas » n'apprenait rien et ne se
    // justifiait pas sur un seul (retiree le 10/08 a la demande de
    // Raci). Le retour visuel existe deja : la liste se ferme et la
    // quantite se selectionne. Signale par Raci le 10/08 :
    // Avoine encodee a 100 g, un appui sur le meme aliment dans la
    // liste donnait deux lignes de 100 g et un total de 760 kcal pour
    // 380 reellement manges — la journee comptait faux, pas seulement
    // la liste qui s'allongeait.
    const existant = dejaLa.get(nom);
    setQ('');
    setActif(false);          // la liste se referme, comme attendu
    if (champRef.current) champRef.current.blur();
    if (existant) { ingNouveau.value = existant.id; return; }

    const d = DB[nom] || customFoods.value[nom] || {};
    // Aliment "a la piece" (burger, oeuf...) : portion par defaut = 1 piece
    const id = ajouterIngredient(repasId, nom, d.unit || 100);
    noterUsage(nom);          // c'est ce comptage qui fait la liste
    ingNouveau.value = id;    // la quantite prend le relais
  };

  // Champ actif : on fait remonter la zone de saisie en haut de
  // l'ecran. Sans cela, le clavier recouvre la liste de resultats et
  // l'utilisateur tape a l'aveugle.
  useEffect(() => {
    if (!actif) return;
    const id = setTimeout(() => {
      const el = zoneRef.current;
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 140);   // on laisse le clavier finir son ouverture
    return () => clearTimeout(id);
  }, [actif]);

  // Hauteur de la liste calculee sur l'espace REELLEMENT visible :
  // clavier ouvert, clavier replie, barre du bas... une hauteur fixe
  // laissait toujours des aliments hors de l'ecran.
  const [hListe, setHListe] = useState(240);
  useEffect(() => {
    if (!actif) return;
    const vv = window.visualViewport;

    const mesurer = () => {
      const champ = champRef.current;
      if (!champ) return;
      const bas = champ.getBoundingClientRect().bottom;
      const basVisible = vv ? (vv.offsetTop + vv.height) : window.innerHeight;
      // Clavier ouvert : il ne reste que la bande au-dessus de lui.
      // Clavier replie : il faut degager la barre de navigation.
      const clavierOuvert = vv ? (window.innerHeight - vv.height > 120) : false;
      const marge = clavierOuvert ? 16 : 88;
      setHListe(Math.max(140, Math.round(basVisible - bas - marge)));
    };

    mesurer();
    const t1 = setTimeout(mesurer, 180);   // apres l'ouverture du clavier
    const t2 = setTimeout(mesurer, 420);   // apres le defilement doux
    if (vv) {
      vv.addEventListener('resize', mesurer);
      vv.addEventListener('scroll', mesurer);
    }
    window.addEventListener('resize', mesurer);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      if (vv) {
        vv.removeEventListener('resize', mesurer);
        vv.removeEventListener('scroll', mesurer);
      }
      window.removeEventListener('resize', mesurer);
    };
  }, [actif]);

  // Un appui en dehors de la zone referme la liste.
  useEffect(() => {
    if (!actif) return;
    const dehors = (e) => {
      if (zoneRef.current && !zoneRef.current.contains(e.target)) setActif(false);
    };
    document.addEventListener('pointerdown', dehors, true);
    return () => document.removeEventListener('pointerdown', dehors, true);
  }, [actif]);

  return (
    <div class="mc-ajout-zone" ref={zoneRef}>
      <div class="mc-ajout">
        {/* Raci, 9/09 : « le texte + Ajouter un aliment dans la barre
            de recherche, il disparait a chaque clic et ca nous evite un
            bouton supplementaire ». La loupe annoncait une recherche ;
            le « + » annonce ce qu'on vient faire — ajouter. Le signe
            reste visible quand le champ est rempli, l'invite non : elle
            a fait son travail. */}
        <span class="mc-ajout-plus" aria-hidden="true">+</span>
        <input
          ref={champRef}
          placeholder={t(phCourt ? 'mc_add_ph_court' : 'mc_add_ph')}
          value={q}
          onInput={e => { setQ(e.currentTarget.value); setActif(true); }}
          onFocus={() => setActif(true)}
        />
        <button
          class="mc-scan"
          onClick={() => { if (estPremium.value) setScan(true); else ongletActif.value = 'premium'; }}
          aria-label="Scanner un code-barres"
        >
          <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
            <path d="M3 5v14M6.5 5v14M10 5v14M13.5 5v14M17 5v14M20.5 5v14" />
          </svg>
          {!estPremium.value && <i class="mc-scan-pro">✦</i>}
        </button>
        {/* Les entrees IA vivent la ou l'on remplit le repas (Raci). */}
        <button
          class="mc-scan"
          onClick={() => { if (estPremium.value) setIaVocal(true); else ongletActif.value = 'premium'; }}
          aria-label="Ajout vocal"
        >
          <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
            <rect x="9.4" y="2.6" width="5.2" height="10.2" rx="2.6" />
            <path d="M6 11.5a6 6 0 0012 0M12 17.5v3.4M8.8 20.9h6.4" />
          </svg>
          {!estPremium.value && <i class="mc-scan-pro">✦</i>}
        </button>
        <button
          class="mc-scan"
          onClick={() => { if (estPremium.value) setIaPhoto(true); else ongletActif.value = 'premium'; }}
          aria-label="Photo d'assiette"
        >
          <svg viewBox="0 0 24 24" class="ic" aria-hidden="true">
            <path d="M3.5 8.5A2.5 2.5 0 016 6h1.9l1.2-1.9a1.6 1.6 0 011.36-.75h3.08c.55 0 1.06.28 1.36.75L16.1 6H18a2.5 2.5 0 012.5 2.5v8A2.5 2.5 0 0118 19H6a2.5 2.5 0 01-2.5-2.5v-8z" />
            <circle cx="12" cy="12.4" r="3.6" />
          </svg>
          {!estPremium.value && <i class="mc-scan-pro">✦</i>}
        </button>
      </div>
      {iaVocal && <VocalModal repasId={repasId} fermer={() => setIaVocal(false)} />}
      {iaPhoto && <PhotoModal repasId={repasId} fermer={() => setIaPhoto(false)} />}

      {actif && (platsTrouves.length > 0 || !listeVide) && (
        <div class="mc-resultats" style={{ maxHeight: hListe + 'px' }}>

          {platsTrouves.map(p => {
            const part = macrosPortion(p);
            return (
              <button class="mc-res-plat" key={'p' + p.id} onClick={() => setPlatChoisi(p)}>
                <span class="mc-res-nom">🍲 {p.nom}</span>
                <span class="kc">{Math.round(part.kcal)} kcal / {t('mp_portion_n')}</span>
              </button>
            );
          })}

          {/* Sans saisie : favoris epingles, puis aliments les plus
              encodes. Deux titres, pour qu'on comprenne d'ou vient
              chaque liste et ce que l'etoile fabrique. */}
          {terme.length < 2 && favVus.length > 0 && (
            <div class="mc-res-titre">{t('fav_titre')}</div>
          )}
          {terme.length < 2 && favVus.map(nom => ligneResultat(nom))}

          {terme.length < 2 && courants.length > 0 && (
            <div class="mc-res-titre">{t('mc_courants')}</div>
          )}
          {terme.length < 2 && courants.map(nom => ligneResultat(nom))}

          {terme.length >= 2 && resultats.map(nom => ligneResultat(nom))}

          {/* Retour de bascule : ce qui vient de se passer, et de quoi
              le defaire. Sans lui, une etoile touchee par megarde
              reste invisible — c'est exactement ce qui s'etait
              produit. Il vit DANS le panneau : celui-ci est en
              position absolue, une bande posee apres lui se
              retrouvait par-dessus la barre de recherche. */}
          {avis && (
            <div class="mc-avis-fav">
              <span class="maf-txt">
                {t(avis.ajoute ? 'fav_ajoute' : 'fav_enleve', { nom: avis.nom })}
              </span>
              <button class="maf-annuler" onClick={() => { basculerFavori(avis.nom); setAvis(null); }}>
                {t('fav_annuler')}
              </button>
            </div>
          )}

          {/* Acces discret a la bibliotheque, uniquement si elle existe */}
          {plats.value.length > 0 && (
            <button
              class="mc-res-gerer"
              onClick={() => { setActif(false); ouvrirMesPlats.value = true; }}
            >{t('mp_gerer')}</button>
          )}
        </div>
      )}

      {platChoisi && (
        <ChoixPortions
          plat={platChoisi}
          fermer={() => setPlatChoisi(null)}
          valider={(n) => { ajouterPlat(repasId, platChoisi, n); setPlatChoisi(null); setQ(''); setActif(false); }}
        />
      )}

      {scan && <Scanner repasId={repasId} fermer={() => setScan(false)} />}
    </div>
  );
}

export function MealCard({ r, aSuivre, fait }) {
  const tot = totauxRepas(r);
  const vide = r.ings.length === 0;
  const [edite, setEdite] = useState(false);
  // 22/10 : etat d'un repas du plan — prevu, mange, saute, autre (remplace).
  const choisi = r.duPlan && (r.saute || r.remplace);
  // Trois zones : vignette, contenu, actions.
  // Le crayon et le chevron sont regroupes dans la zone d'actions,
  // centres sur la meme ligne : places separement, ils se retrouvaient
  // l'un en haut, l'autre au milieu.
  return (
    <div class={'mc' + (aSuivre ? ' mc--suivant' : '') + (fait ? ' mc--fait' : '') + (r.prevu ? ' mc--prevu' : '') + (r.saute ? ' mc--saute' : '') + (r.remplace ? ' mc--autre' : '')}>
      <div class="mc-tete" onClick={() => { if (!edite) repasOuvertId.value = r.id; }}>

        <div class="mc-vignette" dangerouslySetInnerHTML={{ __html: illustration(r) }} />

        <div class="mc-info">
          {edite ? (
            <input
              class="mc-titre-champ"
              value={r.nom}
              onClick={e => e.stopPropagation()}
              onInput={e => renommerRepas(r.id, e.currentTarget.value)}
              onBlur={() => setEdite(false)}
              onKeyDown={e => e.key === 'Enter' && setEdite(false)}
              autoFocus
            />
          ) : (
            <h3 class="mc-titre">{r.nom}</h3>
          )}
          <p class="mc-sous">{
            r.saute ? 'Sauté · 0 kcal'
            : r.remplace ? (r.prevu ? 'Autre chose · à noter' : `Autre chose · ${tot.kcal.toFixed(0)} kcal`)
            : !vide ? (r.prevu ? `Prévu · ${tot.kcal.toFixed(0)} kcal` : `${tot.kcal.toFixed(0)} kcal`)
              : (() => {
                  const f = fourchetteRepas(r.cle);
                  return f ? `${t('mc_reco')} ${f.min} – ${f.max} kcal` : t('mc_empty');
                })()
          }</p>
        </div>

        <div class="mc-actions">
          {/* 22/10 Raci : repas du plan coche en un geste, decochable. */}
          {choisi && (
            <button class="mc-annuler" aria-label={`Remettre ${r.nom} en prévu`}
              onClick={e => { e.stopPropagation(); remettrePrevu(r.id); }}>
              <svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></svg>
            </button>
          )}
          {r.duPlan && !vide && !choisi && !r.prevu && (
            <button
              class="mc-coche mc-coche--fait"
              role="checkbox"
              aria-checked="true"
              aria-label={`Remettre ${r.nom} en prévu`}
              onClick={e => { e.stopPropagation(); annulerValidation(r.id); }}
            >
              <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </button>
          )}
          {!r.duPlan && <button
            class="mc-crayon"
            onClick={e => { e.stopPropagation(); setEdite(true); }}
            aria-label="Renommer"
          >
            <svg viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
          </button>}
          {!r.fixe && (
            <button
              class="mc-suppr"
              onClick={e => { e.stopPropagation(); supprimerRepas(r.id); }}
              aria-label="Supprimer ce repas"
            >✕</button>
          )}
          <span class="mc-chevron mc-chevron--nav" aria-hidden="true">›</span>
        </div>
      </div>
      {/* 24/10 Raci : les trois issues d'un repas du plan sont visibles d'emblee,
          HORS de la zone qui ouvre la fiche (.mc-tete) : aucun clic ici n'ouvre le repas,
          sauf « Mangé autre chose » qui ouvre la page pour noter ce qui a ete mange. */}
      {r.duPlan && r.prevu && !r.remplace && !vide && (
        <div class="mc-plan" role="group" aria-label={`Que s'est-il passé pour ${r.nom} ?`} onClick={e => e.stopPropagation()}>
          <button class="mc-plan-btn mc-plan-btn--mange" onClick={e => { e.stopPropagation(); validerRepas(r.id); }}>✓ Mangé</button>
          <button class="mc-plan-btn mc-plan-btn--saute" onClick={e => { e.stopPropagation(); sauterRepas(r.id); }}>Sauté</button>
          <button class="mc-plan-btn mc-plan-btn--autre" onClick={e => { e.stopPropagation(); mangeAutreChose(r.id); repasOuvertId.value = r.id; }}>Mangé autre chose</button>
        </div>
      )}
    </div>
  );
}
