import { useState, useEffect, useRef } from 'preact/hooks';
import { signal, effect } from '@preact/signals';
import { identite } from '../services/firebase.js';
import { chargerDonnees, sauvegarder } from '../services/sync.js';
import { ajouterIngredient } from '../store/journal.js';
import { createPortal } from 'preact/compat';
import { ecritureBloquee } from '../store/acces-nutrition.js';

// ============================================================
// SCAN CODE-BARRES v2 (Premium) — camera -> Open Food Facts ->
// creation auto de l'aliment + memorisation dans customFoods.
// ============================================================

export const customFoods = signal({});
let uidC = null, pretC = false;

effect(() => {
  const u = identite.value;
  if (!u) { pretC = false; return; }
  if (u === uidC && pretC) return;
  uidC = u; pretC = false;
  chargerDonnees(u).then(d => {
    if (uidC !== u) return;
    customFoods.value = (d && d.customFoods) || {};
    window.__customFoods = customFoods.value;
    pretC = true;
  });
});

effect(() => {
  const c = customFoods.value;
  window.__customFoods = c;
  const u = identite.value;
  if (!u || !pretC) return;
  sauvegarder(u, { customFoods: c });
});

async function chercherProduit(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product, n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
  if (kcal == null) return null;
  const nom = [p.product_name_fr || p.product_name, p.brands ? p.brands.split(',')[0].trim() : '']
    .filter(Boolean).join(' — ') || `Produit ${code}`;
  // Detail nutritionnel : Open Food Facts le fournit dans la meme
  // reponse. On ne conserve que ce qui est reellement renseigne
  // (undefined plutot que 0 : un champ absent n'est pas un zero).
  const opt = (v) => (v == null || v === '' ? undefined : Math.round(Number(v) * 10) / 10);
  // Le sel prime sur le sodium : c'est l'unite des etiquettes europeennes.
  const sel = n.salt_100g != null ? opt(n.salt_100g)
    : (n.sodium_100g != null ? opt(Number(n.sodium_100g) * 2.5) : undefined);

  return {
    nom,
    kcal: Math.round(kcal),
    prot: Math.round((n.proteins_100g || 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
    lip: Math.round((n.fat_100g || 0) * 10) / 10,
    fibres: opt(n.fiber_100g),
    sucres: opt(n.sugars_100g),
    satures: opt(n['saturated-fat_100g']),
    sel,
  };
}

export function Scanner({ repasId, fermer }) {
  const [statut, setStatut] = useState('Vise le code-barres…');
  const [manuel, setManuel] = useState('');
  // Le flux video a-t-il demarre ? S'il echoue, la photo devient le
  // chemin principal et non un recours discret.
  const [videoOk, setVideoOk] = useState(null);
  const scannerRef = useRef(null);
  const fichierRef = useRef(null);

  useEffect(() => {
    let qr;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        qr = new Html5Qrcode('scan-zone');
        scannerRef.current = qr;
        await qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 150 } },
          (code) => { qr.stop().catch(() => {}); traiter(code); },
          () => {});
        setVideoOk(true);
      } catch (e) {
        // WebKit refuse regulierement getUserMedia quand BELFIT tourne
        // en mode PWA sur iPhone (permission non memorisee, versions
        // d'iOS qui la cassent). L'appareil photo natif, lui, repond
        // toujours : on bascule dessus au lieu d'imposer 13 chiffres
        // au clavier.
        setVideoOk(false);
        setStatut('Caméra indisponible ici — prends le code en photo');
      }
    })();
    return () => { try { scannerRef.current?.stop(); } catch {} };
  }, []);

  /** Lecture d'un code-barres sur une photo prise avec l'appareil natif. */
  const lirePhoto = async (fichier) => {
    if (!fichier) return;
    setStatut('Lecture de la photo…');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      // scanFile a besoin d'un conteneur distinct de celui du flux video.
      const lecteur = scannerRef.current || new Html5Qrcode('scan-zone');
      try { await lecteur.stop(); } catch (e) { /* pas de flux en cours */ }
      const code = await lecteur.scanFile(fichier, false);
      traiter(code);
    } catch (e) {
      setStatut('Code illisible — recadre bien le code-barres, ou saisis-le');
    }
  };

  const traiter = async (code) => {
    setStatut('Recherche du produit…');
    const prod = await chercherProduit(code.trim());
    if (!prod) { setStatut('Produit non trouvé — essaie un autre code'); return; }
    if (ecritureBloquee()) { setStatut('Alimentation fermée'); return; }
    customFoods.value = { ...customFoods.value, [prod.nom]: {
      kcal: prod.kcal, prot: prod.prot, carbs: prod.carbs, lip: prod.lip,
      fibres: prod.fibres, sucres: prod.sucres, satures: prod.satures, sel: prod.sel,
    }};
    ajouterIngredient(repasId, prod.nom, 100);
    setStatut(`✓ ${prod.nom} ajouté`);
    setTimeout(fermer, 900);
  };

  return createPortal(
    <>
      <div class="voile montre" onClick={fermer} />
      <div class="modale montre" style="position:relative">
        <button class="scan-x" onClick={fermer} aria-label="Fermer">✕</button>
        <h3>Scanner un produit</h3>
        {/* La zone video reste dans le DOM (scanFile en a besoin) mais
            se replie quand il n'y a rien a montrer : un rectangle noir
            de 200 px qui n'affiche aucune image n'aide personne. */}
        <div id="scan-zone" class={'scan-zone' + (videoOk === false ? ' repliee' : '')} />
        <div class="scan-statut">{statut}</div>

        {/* Toujours propose, pas seulement en cas d'echec : sur iPhone
            le flux video peut demarrer puis se figer sans erreur. */}
        <button class={'scan-photo' + (videoOk === false ? ' primaire' : '')}
          onClick={() => fichierRef.current && fichierRef.current.click()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
            <circle cx="12" cy="13.5" r="3.4" />
          </svg>
          Prendre le code en photo
        </button>
        <input ref={fichierRef} type="file" accept="image/*" capture="environment"
          class="scan-fichier" onChange={e => {
            const f = e.currentTarget.files && e.currentTarget.files[0];
            e.currentTarget.value = '';
            lirePhoto(f);
          }} />

        <form onSubmit={e => { e.preventDefault(); if (manuel) traiter(manuel); }} class="scan-manuel">
          <input placeholder="Ou saisis le code-barres" value={manuel} onInput={e => setManuel(e.currentTarget.value)} />
          <button type="submit">OK</button>
        </form>
      </div>
    </>
  , document.body);
}
