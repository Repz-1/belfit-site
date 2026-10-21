// Deploiement : automatique via GitHub Actions (.github/workflows/serveur.yml)
// a chaque changement de ce dossier, depuis le 27/09. Plus besoin du PC.
// Espace coach : secret COACH_CODE pose depuis GitHub (27/09, change le meme jour).
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

/* Periode de test ouverte : retiree le 02/10. Le micro et la photo
 * suivent desormais le QUOTA IA (voir consommerQuotaIA). Le compte doit
 * rester connecte : sans jeton, ces fonctions deviendraient un service
 * Gemini gratuit et anonyme. */

// Secret partagé avec LemonSqueezy (défini via: firebase functions:secrets:set LEMON_WEBHOOK_SECRET)
const LEMON_WEBHOOK_SECRET = defineSecret("LEMON_WEBHOOK_SECRET");

/**
 * Reçoit les webhooks LemonSqueezy et met à jour le statut Premium
 * sur le compte Firestore correspondant (users/{uid}.premium).
 * L'uid Firebase est transmis via custom_data au moment du checkout.
 */
exports.lemonWebhook = onRequest(
  {secrets: [LEMON_WEBHOOK_SECRET], region: "europe-west1", cors: false},
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      // 1) Vérifier la signature (HMAC-SHA256 du corps brut)
      const secret = LEMON_WEBHOOK_SECRET.value();
      const signature = (req.get("X-Signature") || "").trim();

      // rawBody = octets bruts exacts recus (indispensable pour le HMAC).
      // Fallback si absent : re-serialiser (moins fiable mais evite un crash).
      const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), "utf8");

      const digest = crypto.createHmac("sha256", secret)
        .update(raw)
        .digest("hex");

      const a = Buffer.from(digest, "utf8");
      const b = Buffer.from(signature, "utf8");
      const valide = a.length === b.length && crypto.timingSafeEqual(a, b);

      if (!valide) {
        // Diagnostic (visible dans les logs Firebase) : compare les empreintes
        // SANS jamais logguer le secret lui-meme.
        console.warn("Signature invalide", JSON.stringify({
          digestCalcule: digest.slice(0, 12) + "...",
          signatureRecue: signature.slice(0, 12) + "...",
          rawBodyPresent: !!req.rawBody,
          rawBodyLen: raw.length,
          secretLen: secret ? secret.length : 0,
        }));
        res.status(401).send("Invalid signature");
        return;
      }

      // 2) Lire l'évènement
      const body = JSON.parse(req.rawBody.toString("utf8"));
      const event = body && body.meta && body.meta.event_name;
      const uid = body && body.meta && body.meta.custom_data && body.meta.custom_data.uid;
      const attr = (body && body.data && body.data.attributes) || {};
      const status = attr.status || null; // active | on_trial | paused | past_due | unpaid | cancelled | expired

      if (!uid) {
        console.warn("Pas d'uid dans custom_data", event);
        res.status(200).send("no uid");
        return;
      }

      // 2b) Coaching a paiement unique (26/09) : « Premier plan » (80 EUR)
      //     ou « Mise a jour » (60 EUR). Nommer les produits LemonSqueezy
      //     avec ces mots. On note la commande ; le coach livre le plan.
      if (event === "order_created") {
        const nomProduit = [attr.first_order_item && attr.first_order_item.product_name,
          attr.first_order_item && attr.first_order_item.variant_name, attr.product_name]
          .filter(Boolean).join(" ").toLowerCase();
        const typeCoach = /mise a jour|mise à jour|update/.test(nomProduit) ? "maj"
          : /premier plan|plan coach|coaching/.test(nomProduit) ? "plan" : null;
        if (typeCoach) {
          await db.collection("users").doc(uid).set({
            commandeCoach: {
              type: typeCoach,
              payeLe: new Date().toISOString(),
              montant: attr.total_formatted || null,
              commande: body.data && body.data.id || null,
            },
          }, {merge: true});
          // IA illimitee 30 jours apres chaque achat coaching (02/10).
          // Prolonge a partir de la date la plus lointaine.
          const refQ = db.collection("quotasIA").doc(uid);
          const sq = await refQ.get();
          const finActuelle = sq.exists && sq.data().illimiteJusqu ? Date.parse(sq.data().illimiteJusqu) : 0;
          const base = Math.max(Date.now(), finActuelle || 0);
          await refQ.set({illimiteJusqu: new Date(base + IA_JOURS_COACHING * 864e5).toISOString()}, {merge: true});
          console.log("Commande coaching:", uid, typeCoach);
          res.status(200).send("ok");
          return;
        }
      }

      // 3) Déterminer si Premium actif
      let premium;
      if (event && event.indexOf("subscription_") === 0) {
        // Un abonnement annulé reste actif jusqu'à la fin de période -> LS garde status "active"/"cancelled"
        premium = (status === "active" || status === "on_trial");
      } else if (event === "order_created") {
        premium = true;
      } else {
        res.status(200).send("ignored");
        return;
      }

      // 4) Identifier la formule : le quota d'ajustements en depend
      //    (voir QUOTA_AJUSTEMENTS plus bas).
      const libelle = [
        attr.variant_name, attr.product_name, attr.first_order_item &&
        attr.first_order_item.variant_name,
      ].filter(Boolean).join(" ").toLowerCase();
      // L'ORDRE COMPTE : « 3 months » contient « month ». Teste avant
      // le mensuel, le trimestriel serait sinon classe mensuel et
      // perdrait un ajustement par mois.
      let formule = null;
      if (/annuel|annual|yearly|year|jaar/.test(libelle)) {
        formule = "annuel";
      } else if (/trimestr|quarter|3\s*mois|3\s*months|3\s*maanden/.test(libelle)) {
        formule = "trimestriel";
      } else if (/mensuel|monthly|month|maand/.test(libelle)) {
        formule = "mensuel";
      }

      // 5) Écrire sur le compte
      const maj = {
        premium: premium,
        source: "lemonsqueezy",
        lsStatus: status,
        lsEvent: event,
        updatedAt: Date.now(),
      };
      if (formule) maj.formule = formule;
      await db.collection("users").doc(uid).set(maj, {merge: true});

      console.log("Premium maj:", uid, premium, event, status, formule);
      res.status(200).send("ok");
    } catch (e) {
      console.error("Erreur webhook:", e);
      res.status(500).send("error");
    }
  }
);


// ============================================================
// TRANSCRIPTION VOCALE (Premium) — audio -> JSON aliments via Gemini.
// Le navigateur enregistre l'audio (MediaRecorder), l'envoie ici en base64,
// Gemini transcrit ET structure en une seule etape. Plus fiable et coherent
// que le Web Speech API navigateur.
// Cle API Gemini stockee en secret : firebase functions:secrets:set GEMINI_API_KEY
// ============================================================
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");


/* ============================================================
 * QUOTA IA (02/10, decision Raci) : photo et micro.
 *   - 7 premiers jours apres l'inscription : 25 utilisations par jour ;
 *   - ensuite : 8 par jour ;
 *   - illimite : 30 jours apres chaque achat coaching (plan ou mise a
 *     jour), ou acces PRO offert / code (premium:true, premiumJusqu).
 * Compte cote serveur (quotasIA/{uid}, ecriture admin seulement) :
 * impossible a remettre a zero depuis le navigateur.
 * Jour = jour calendaire de Bruxelles.
 * ============================================================ */
const IA_JOURS_DECOUVERTE = 7;
const IA_QUOTA_DECOUVERTE = 25;
const IA_QUOTA_JOUR = 8;
const IA_JOURS_COACHING = 30;

function jourBruxelles() {
  return new Intl.DateTimeFormat("fr-CA", {timeZone: "Europe/Brussels"}).format(new Date());
}

/** Reserve une utilisation. Renvoie {ok, limite, restant, illimite}. */
async function consommerQuotaIA(uid, userData) {
  const maintenant = Date.now();
  const u = userData || {};
  const proActif = u.premium === true &&
    (!u.premiumJusqu || Date.parse(u.premiumJusqu) > maintenant);
  const ref = db.collection("quotasIA").doc(uid);
  const snap = await ref.get();
  const q = snap.exists ? snap.data() : {};
  const coachingActif = q.illimiteJusqu && Date.parse(q.illimiteJusqu) > maintenant;
  if (proActif || coachingActif) return {ok: true, illimite: true};

  let creeLe = maintenant;
  try {
    const compte = await admin.auth().getUser(uid);
    creeLe = Date.parse(compte.metadata.creationTime) || maintenant;
  } catch (e) { /* compte introuvable : traite comme nouveau */ }
  const decouverte = maintenant - creeLe < IA_JOURS_DECOUVERTE * 864e5;
  const limite = decouverte ? IA_QUOTA_DECOUVERTE : IA_QUOTA_JOUR;
  const jour = jourBruxelles();

  return db.runTransaction(async (tx) => {
    const s2 = await tx.get(ref);
    const d = s2.exists ? s2.data() : {};
    const n = d.jour === jour ? (d.n || 0) : 0;
    if (n >= limite) return {ok: false, limite, restant: 0};
    tx.set(ref, {jour, n: n + 1}, {merge: true});
    return {ok: true, limite, restant: limite - n - 1};
  });
}

/** Rend l'utilisation si l'IA a echoue : l'echec ne doit pas compter. */
async function rendreQuotaIA(uid, q) {
  if (!q || !q.ok || q.illimite) return;
  try {
    await db.collection("quotasIA").doc(uid).set(
        {n: admin.firestore.FieldValue.increment(-1)}, {merge: true});
  } catch (e) { /* sans gravite */ }
}

exports.transcrireVocal = onRequest(
  {secrets: [GEMINI_API_KEY], region: "europe-west1", cors: true, timeoutSeconds: 60},
  async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({error: "method"}); return; }

    let quota = null; let uidQuota = null;
    try {
      // 1) Verifier que l'utilisateur est connecte, puis son quota IA
      const authHeader = req.get("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) { res.status(401).json({error: "no_auth"}); return; }

      let uid;
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        uid = decoded.uid;
      } catch (e) {
        res.status(401).json({error: "bad_token"}); return;
      }
      uidQuota = uid;

      const userDoc = await db.collection("users").doc(uid).get();
      quota = await consommerQuotaIA(uid, userDoc.exists ? userDoc.data() : null);
      if (!quota.ok) { res.status(429).json({error: "quota", limite: quota.limite}); return; }
      res.set("X-Quota-Restant", quota.illimite ? "illimite" : String(quota.restant));

      // 2) Recuperer l'audio (base64) et son type
      const {audioBase64, mimeType} = req.body || {};
      if (!audioBase64) { res.status(400).json({error: "no_audio"}); return; }

      // 3) Appel Gemini : audio -> JSON structure
      const prompt = `Tu analyses un enregistrement audio en francais ou l'utilisateur decrit ce qu'il a mange ou bu.
Transcris puis extrais chaque aliment avec sa quantite. Reponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans backticks.
Format exact : [{"aliment":"nom en francais","quantite":nombre,"unite":"g"|"ml"|"piece"}]
Regles :
- Convertis en grammes/ml quand c'est possible (ex: "une dose de whey"=30g, "un bol de riz"=200g, "un oeuf"=60g, "une banane"=120g).
- Si l'unite est une piece indenombrable, mets "piece" et quantite = nombre de pieces.
- Ignore les mots de liaison. Si rien d'exploitable, renvoie [].
- Noms d'aliments simples et courants (ex: "poulet", "riz", "avoine", "banane").`;

      // Gemini n'accepte pas les parametres de codec ("audio/webm;codecs=opus")
      const typeAudio = String(mimeType || "audio/wav").split(";")[0].trim();
      console.log("transcrireVocal", JSON.stringify({uid, typeAudio, tailleKo: Math.round(audioBase64.length * 0.75 / 1024)}));

      // Google retire regulierement ses modeles (gemini-2.0-flash a ete
      // coupe le 1er juin 2026, ce qui a casse le vocal en silence).
      // On essaie donc une liste ordonnee : si un modele repond 404,
      // on passe au suivant au lieu de tomber en panne.
      const MODELES = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
      const geminiBody = {
        contents: [{
          parts: [
            {text: prompt},
            {inline_data: {mime_type: typeAudio, data: audioBase64}},
          ],
        }],
        generationConfig: {temperature: 0.1, responseMimeType: "application/json"},
      };

      let gRes = null;
      let dernierErr = "";
      for (const modele of MODELES) {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
          modele + ":generateContent?key=" + GEMINI_API_KEY.value();
        gRes = await fetch(url, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(geminiBody),
        });
        if (gRes.ok) { console.log("transcrireVocal modele:", modele); break; }
        dernierErr = (await gRes.text()).slice(0, 300);
        console.error("Gemini", modele, gRes.status, dernierErr);
        if (gRes.status !== 404) break; // autre erreur : inutile d'essayer les suivants
      }

      if (!gRes || !gRes.ok) {
        // Le detail remonte jusqu'a l'ecran du telephone via le diagnostic.
        let detail = "";
        try { detail = (JSON.parse(dernierErr).error || {}).message || ""; } catch (e) { detail = dernierErr; }
        await rendreQuotaIA(uidQuota, quota);
        res.status(502).json({error: "gemini_failed", detail: String(detail).slice(0, 160)});
        return;
      }

      const gData = await gRes.json();
      const texte = gData.candidates &&
        gData.candidates[0] &&
        gData.candidates[0].content &&
        gData.candidates[0].content.parts[0].text || "[]";

      let aliments;
      try {
        aliments = JSON.parse(texte);
        if (!Array.isArray(aliments)) aliments = [];
      } catch (e) {
        console.warn("JSON parse fail", texte.slice(0, 200));
        aliments = [];
      }
      if (!aliments.length) {
        console.warn("Aucun aliment extrait. Reponse Gemini:", texte.slice(0, 300));
      }

      res.status(200).json({aliments});
    } catch (err) {
      console.error("transcrireVocal error", err);
      await rendreQuotaIA(uidQuota, quota);
      res.status(500).json({error: "server"});
    }
  }
);

// ============================================================
// PHOTO D'ASSIETTE -> ALIMENTS
//
// Meme pipeline que le vocal : media -> Gemini -> JSON structure
// {aliment, quantite, unite} -> journal. Seuls changent le type
// d'entree (image) et le prompt. Premium-gated cote serveur,
// comme le vocal. Les resultats sont PRE-REMPLIS mais modifiables
// cote client avant validation : l'IA estime les portions, elle
// ne les connait pas.
// ============================================================

/* ============================================================
 * COACH IA TEXTE (04/10, Raci : « c'est un coach IA qui fonctionne ou
 * pas »). La barre repas lit d'abord ses phrases simples sans IA ;
 * tout ce qu'elle ne comprend pas arrive ici. Gemini rattache chaque
 * aliment a un nom EXACT de la base (aliments-noms.json) ; s'il n'y en
 * a aucun, il estime les valeurs pour 100 g (aliment « hors base »).
 * Les quantites reviennent toujours en grammes / ml.
 * Compte dans le quota IA, comme la photo et le micro (relance 05/10).
 * ============================================================ */
const NOMS_ALIMENTS = require("./aliments-noms.json");

exports.coachAgent = onRequest(
    {secrets: [GEMINI_API_KEY], region: "europe-west1", cors: true, timeoutSeconds: 30},
    async (req, res) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") { res.status(204).send(""); return; }
      if (req.method !== "POST") { res.status(405).json({error: "method"}); return; }

      let quota = null; let uidQuota = null;
      try {
        const h = req.get("Authorization") || "";
        const token = h.startsWith("Bearer ") ? h.slice(7) : "";
        let uid;
        try { uid = (await admin.auth().verifyIdToken(token)).uid; } catch (e) { res.status(401).json({error: "no_auth"}); return; }
        uidQuota = uid;
        const message = String((req.body || {}).message || "").trim().slice(0, 600);
        if (!message) { res.status(400).json({error: "vide"}); return; }

        const userDoc = await db.collection("users").doc(uid).get();
        quota = await consommerQuotaIA(uid, userDoc.exists ? userDoc.data() : null);
        if (!quota.ok) { res.status(429).json({error: "quota", limite: quota.limite}); return; }
        res.set("X-Quota-Restant", quota.illimite ? "illimite" : String(quota.restant));

        const prompt = `Tu es le coach nutrition de l'app BELFIT. L'utilisateur ecrit ce qu'il a mange ou bu, en francais (parfois avec des fautes ou en abrege).
Reponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{"aliments":[{"aliment":string,"quantite":number,"hors_base":boolean,"kcal":number,"prot":number,"carbs":number,"lip":number}],"eauLitres":number,"repas":"pdej"|"dej"|"diner"|"snack"|null}
Regles :
- Chaque aliment cite = une entree. N'en oublie AUCUN (ex: « 200 g de pommes, du riz et du poulet » = 3 entrees). « pomme(s) » seul = le fruit, pas la pomme de terre.
- "aliment" : copie EXACTEMENT un nom de la BASE ci-dessous (sans la mention entre crochets) quand c'est le meme aliment. Respecte « cru » / « cuit » quand c'est dit ; sinon, feculents, viandes et poissons : version cuite. Alors hors_base=false et ne mets pas kcal/prot/carbs/lip.
- Si aucun nom de la base ne correspond vraiment (plat specifique, marque, recette etrangere) : "aliment" = nom court en francais, hors_base=true, et kcal/prot/carbs/lip = valeurs realistes POUR 100 g. Un plat compose peut rester une seule entree.
- "quantite" : TOUJOURS en grammes (ou ml pour les boissons), jamais en pieces. Convertis : 1 oeuf 50 g, 1 jaune 17 g, 1 blanc 33 g, 1 tranche de pain 35 g, 1 cuillere a soupe d'huile 10 g, 1 cuillere a cafe 5 g, 1 sachet de riz cuit 125 g, 1 verre 250 ml, 1 canette 330 ml, 1 banane 120 g, 1 pomme 150 g. « 2 sachets de 125 g » = 250. « 9 blancs de 30 g » = 270.
- L'eau pure va dans "eauLitres" (pas dans aliments). 0 si aucune.
- "repas" seulement si l'utilisateur le dit (matin, midi, soir, collation), sinon null.
- Si le message ne parle pas de nourriture ni de boisson : {"aliments":[],"eauLitres":0,"repas":null}.
BASE : ${NOMS_ALIMENTS.join(" | ")}

Message : ${JSON.stringify(message)}`;

        const MODELES = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
        const corps = {contents: [{parts: [{text: prompt}]}],
          generationConfig: {temperature: 0.1, responseMimeType: "application/json"}};
        let gRes = null; let dernierErr = "";
        for (const modele of MODELES) {
          gRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + modele +
            ":generateContent?key=" + GEMINI_API_KEY.value(),
          {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(corps)});
          if (gRes.ok) break;
          dernierErr = (await gRes.text()).slice(0, 300);
          console.error("coachAgent Gemini", modele, gRes.status, dernierErr);
          if (gRes.status !== 404) break;
        }
        if (!gRes || !gRes.ok) {
          await rendreQuotaIA(uidQuota, quota);
          res.status(502).json({error: "gemini_failed"}); return;
        }
        const gData = await gRes.json();
        const texte = (((gData.candidates || [])[0] || {}).content || {parts: [{}]}).parts[0].text || "{}";
        let out = {};
        try { out = JSON.parse(texte); } catch (e) { out = {}; }
        const noms = new Set(NOMS_ALIMENTS.map((n) => n.replace(/ \[piece \d+ g\]$/, "")));
        const num = (x) => Math.max(0, Math.round(Number(x) || 0));
        const aliments = (Array.isArray(out.aliments) ? out.aliments : []).slice(0, 15).map((a) => {
          const nom = String(a.aliment || "").replace(/ \[piece \d+ g\]$/, "").trim().slice(0, 60);
          const q = num(a.quantite);
          if (!nom || !q) return null;
          if (noms.has(nom)) return {aliment: nom, quantite: q, unite: "g"};
          return {aliment: nom, quantite: q, unite: "g", horsBase: {
            kcal: num(a.kcal), prot: Number(a.prot) || 0, carbs: Number(a.carbs) || 0, lip: Number(a.lip) || 0}};
        }).filter(Boolean);
        const eauLitres = Math.min(5, Math.max(0, Number(out.eauLitres) || 0));
        const repas = ["pdej", "dej", "diner", "snack"].includes(out.repas) ? out.repas : null;
        if (!aliments.length && !eauLitres) await rendreQuotaIA(uidQuota, quota);
        res.json({aliments, eauLitres, repas, ia: true});
      } catch (err) {
        console.error("coachAgent error", err);
        await rendreQuotaIA(uidQuota, quota);
        res.status(500).json({error: "server"});
      }
    },
);

exports.analyserPhoto = onRequest(
  {secrets: [GEMINI_API_KEY], region: "europe-west1", cors: true, timeoutSeconds: 60},
  async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({error: "method"}); return; }

    let quota = null; let uidQuota = null;
    try {
      // 1) Connecte, puis quota IA (comme le vocal)
      const authHeader = req.get("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) { res.status(401).json({error: "no_auth"}); return; }

      let uid;
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        uid = decoded.uid;
      } catch (e) {
        res.status(401).json({error: "bad_token"}); return;
      }
      uidQuota = uid;

      const userDoc = await db.collection("users").doc(uid).get();
      quota = await consommerQuotaIA(uid, userDoc.exists ? userDoc.data() : null);
      if (!quota.ok) { res.status(429).json({error: "quota", limite: quota.limite}); return; }
      res.set("X-Quota-Restant", quota.illimite ? "illimite" : String(quota.restant));

      // 2) Recuperer l'image (base64) et son type
      const {imageBase64, mimeType} = req.body || {};
      if (!imageBase64) { res.status(400).json({error: "no_image"}); return; }
      // ~6 Mo max une fois decode : au-dela, le client doit recompresser.
      if (imageBase64.length > 8 * 1024 * 1024) {
        res.status(413).json({error: "image_too_big"}); return;
      }

      // 3) Appel Gemini : photo -> JSON structure
      const prompt = `Tu analyses la photo d'un repas ou d'un aliment.
Identifie chaque aliment visible avec une estimation de sa quantite. Reponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans backticks.
Format exact : [{"aliment":"nom en francais","quantite":nombre,"unite":"g"|"ml"|"piece"}]
Regles :
- Estime les portions en grammes/ml d'apres la taille apparente (assiette standard ~26 cm de diametre comme repere).
- Si l'element se compte a la piece (oeuf, banane, tranche de pain), mets "piece" et quantite = nombre de pieces.
- Nomme l'aliment tel qu'il est PREPARE sur la photo (ex: "riz cuit", "poulet grille", "pates cuites").
- Noms d'aliments simples et courants. Decompose les plats en composants visibles (ex: assiette poulet-riz-brocoli = 3 entrees).
- N'invente pas d'ingredients invisibles (sauces ou huiles non discernables). Si rien d'exploitable (photo floue, pas de nourriture), renvoie [].`;

      const typeImage = String(mimeType || "image/jpeg").split(";")[0].trim();
      console.log("analyserPhoto", JSON.stringify({uid, typeImage, tailleKo: Math.round(imageBase64.length * 0.75 / 1024)}));

      // Meme liste de repli que le vocal : un modele retire (404) ne
      // met pas la feature en panne.
      const MODELES = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
      const geminiBody = {
        contents: [{
          parts: [
            {text: prompt},
            {inline_data: {mime_type: typeImage, data: imageBase64}},
          ],
        }],
        generationConfig: {temperature: 0.1, responseMimeType: "application/json"},
      };

      let gRes = null;
      let dernierErr = "";
      for (const modele of MODELES) {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
          modele + ":generateContent?key=" + GEMINI_API_KEY.value();
        gRes = await fetch(url, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(geminiBody),
        });
        if (gRes.ok) { console.log("analyserPhoto modele:", modele); break; }
        dernierErr = (await gRes.text()).slice(0, 300);
        console.error("Gemini", modele, gRes.status, dernierErr);
        if (gRes.status !== 404) break;
      }

      if (!gRes || !gRes.ok) {
        let detail = "";
        try { detail = (JSON.parse(dernierErr).error || {}).message || ""; } catch (e) { detail = dernierErr; }
        await rendreQuotaIA(uidQuota, quota);
        res.status(502).json({error: "gemini_failed", detail: String(detail).slice(0, 160)});
        return;
      }

      const gData = await gRes.json();
      const texte = gData.candidates &&
        gData.candidates[0] &&
        gData.candidates[0].content &&
        gData.candidates[0].content.parts[0].text || "[]";

      let aliments;
      try {
        aliments = JSON.parse(texte);
        if (!Array.isArray(aliments)) aliments = [];
      } catch (e) {
        console.warn("JSON parse fail", texte.slice(0, 200));
        aliments = [];
      }
      if (!aliments.length) {
        console.warn("Aucun aliment detecte. Reponse Gemini:", texte.slice(0, 300));
      }

      res.status(200).json({aliments});
    } catch (err) {
      console.error("analyserPhoto error", err);
      await rendreQuotaIA(uidQuota, quota);
      res.status(500).json({error: "server"});
    }
  }
);

// ============================================================
// PSEUDONYMES DE CONNEXION
//
// L'utilisateur peut se connecter avec son email OU son pseudo.
// Contrainte : Firebase Auth n'accepte que l'email. Il faut donc
// resoudre pseudo -> compte cote serveur.
//
// Choix de conception : la table des pseudos n'est JAMAIS lisible
// par le client. Sans cela, n'importe qui pourrait aspirer la liste
// des adresses email des utilisateurs (RGPD, donnees de sante).
// La verification du mot de passe se fait ici, et le client ne
// recoit qu'un jeton de connexion — l'email ne sort jamais.
// ============================================================

// Cle Web de l'API Firebase, utilisee pour verifier le mot de passe.
// A definir via : firebase functions:secrets:set FIREBASE_WEB_API_KEY
const FIREBASE_WEB_API_KEY = defineSecret("FIREBASE_WEB_API_KEY");

const PSEUDO_MIN = 3;
const PSEUDO_MAX = 20;
const PSEUDO_MOTIF = /^[a-z0-9_.-]+$/;
// Pseudos interdits : usurpation d'identite de la marque ou du support.
const PSEUDO_RESERVES = new Set([
  "admin", "administrateur", "belfit", "coach", "contact", "support",
  "moderateur", "moderator", "root", "system", "systeme", "info",
  "help", "aide", "staff", "equipe", "team", "officiel", "official",
]);

/** Normalise un pseudo : minuscules, sans espaces superflus. */
function normaliserPseudo(brut) {
  return String(brut || "").trim().toLowerCase();
}

/** Verifie la forme d'un pseudo. Retourne null si valide, sinon un code d'erreur. */
function validerPseudo(pseudo) {
  if (pseudo.length < PSEUDO_MIN) return "trop_court";
  if (pseudo.length > PSEUDO_MAX) return "trop_long";
  if (!PSEUDO_MOTIF.test(pseudo)) return "caracteres";
  if (PSEUDO_RESERVES.has(pseudo)) return "reserve";
  return null;
}

/** Reponse CORS commune : seul le site BELFIT peut appeler ces fonctions. */
function appliquerCors(req, res) {
  const origines = [
    "https://belfit.be",
    "https://www.belfit.be",
    "https://repz-1.github.io",
  ];
  const origine = req.headers.origin;
  if (origines.includes(origine)) {
    res.set("Access-Control-Allow-Origin", origine);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  // reserverPseudo est appelee avec un jeton de session : sans
  // Authorization dans cette liste, le navigateur bloque la requete au
  // prevol et l'inscription echoue juste apres la creation du compte.
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

/**
 * Indique si un pseudo est disponible.
 * Ne revele aucune donnee personnelle : uniquement libre / pris.
 */
exports.pseudoDisponible = onRequest(
  {region: "europe-west1", cors: false},
  async (req, res) => {
    if (appliquerCors(req, res)) return;
    try {
      const pseudo = normaliserPseudo(req.body && req.body.pseudo);
      const probleme = validerPseudo(pseudo);
      if (probleme) {
        res.status(200).json({disponible: false, raison: probleme});
        return;
      }
      const snap = await db.collection("usernames").doc(pseudo).get();
      res.status(200).json({disponible: !snap.exists});
    } catch (err) {
      console.error("pseudoDisponible", err);
      res.status(500).json({error: "server"});
    }
  },
);

/**
 * Reserve un pseudo pour l'utilisateur qui vient de creer son compte.
 * L'ecriture est transactionnelle : deux inscriptions simultanees avec
 * le meme pseudo ne peuvent pas aboutir toutes les deux.
 */
exports.reserverPseudo = onRequest(
  {region: "europe-west1", cors: false},
  async (req, res) => {
    if (appliquerCors(req, res)) return;
    try {
      const jeton = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!jeton) {
        res.status(401).json({error: "non_authentifie"});
        return;
      }
      const decode = await admin.auth().verifyIdToken(jeton);
      const uid = decode.uid;

      const pseudo = normaliserPseudo(req.body && req.body.pseudo);
      const probleme = validerPseudo(pseudo);
      if (probleme) {
        res.status(400).json({error: probleme});
        return;
      }

      const refPseudo = db.collection("usernames").doc(pseudo);
      const refUser = db.collection("users").doc(uid);

      await db.runTransaction(async (tx) => {
        const existant = await tx.get(refPseudo);
        if (existant.exists && existant.data().uid !== uid) {
          throw new Error("pris");
        }
        // Un utilisateur ne peut detenir qu'un seul pseudo :
        // l'ancien est libere si besoin.
        const snapUser = await tx.get(refUser);
        const ancien = snapUser.exists ? snapUser.data().pseudo : null;
        if (ancien && ancien !== pseudo) {
          tx.delete(db.collection("usernames").doc(ancien));
        }
        tx.set(refPseudo, {uid, cree: new Date().toISOString()});
        tx.set(refUser, {pseudo}, {merge: true});
      });

      res.status(200).json({ok: true, pseudo});
    } catch (err) {
      if (err && err.message === "pris") {
        res.status(409).json({error: "pris"});
        return;
      }
      console.error("reserverPseudo", err);
      res.status(500).json({error: "server"});
    }
  },
);

/**
 * Connexion par pseudo.
 * Le mot de passe est verifie ici, cote serveur. En cas de succes,
 * le client recoit un jeton de connexion — jamais l'adresse email.
 */
exports.connexionParPseudo = onRequest(
  {secrets: [FIREBASE_WEB_API_KEY], region: "europe-west1", cors: false},
  async (req, res) => {
    if (appliquerCors(req, res)) return;
    try {
      const pseudo = normaliserPseudo(req.body && req.body.pseudo);
      const motDePasse = String((req.body && req.body.motDePasse) || "");
      if (!pseudo || !motDePasse) {
        res.status(400).json({error: "identifiants"});
        return;
      }

      const snap = await db.collection("usernames").doc(pseudo).get();
      if (!snap.exists) {
        // Meme reponse que pour un mot de passe faux : ne pas reveler
        // quels pseudos existent.
        res.status(401).json({error: "identifiants"});
        return;
      }

      const uid = snap.data().uid;
      const utilisateur = await admin.auth().getUser(uid);

      // Verification du mot de passe via l'API Identity Toolkit.
      const reponse = await fetch(
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" +
          FIREBASE_WEB_API_KEY.value(),
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            email: utilisateur.email,
            password: motDePasse,
            returnSecureToken: false,
          }),
        },
      );

      if (!reponse.ok) {
        res.status(401).json({error: "identifiants"});
        return;
      }

      const jeton = await admin.auth().createCustomToken(uid);
      res.status(200).json({jeton});
    } catch (err) {
      console.error("connexionParPseudo", err);
      res.status(500).json({error: "server"});
    }
  },
);

// ============================================================
// MAIL DE REINITIALISATION AUX COULEURS BELFIT
//
// Firebase envoie par defaut un message en anglais, expedie depuis
// repz-baf60.firebaseapp.com : objet technique, URL brute de trois
// lignes, aucune identite visuelle. Resultat observe : classe en
// courrier indesirable.
//
// Ici : on genere le lien securise avec le SDK Admin, puis on envoie
// NOTRE message depuis belfit.be via Resend.
//
// Secret a poser : firebase functions:secrets:set RESEND_API_KEY
// ============================================================
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

/** Expediteur : doit correspondre au domaine verifie chez Resend. */
const EXPEDITEUR = "BELFIT <noreply@belfit.be>";

/** Ou arrivent les reponses : noreply n'est pas une vraie boite. */
const REPONSE_A = "contact@belfit.be";

/** Notre page de saisie du nouveau mot de passe. */
const PAGE_REINIT = "https://belfit.be/reinitialisation.html";

/** Notre page de confirmation d'adresse. */
const PAGE_VERIF = "https://belfit.be/verification.html";

/** Modele du message, en trois langues. */
const TEXTES = {
  fr: {
    objet: "Réinitialise ton mot de passe BELFIT",
    titre: "Réinitialise ton mot de passe",
    intro: "Tu as demandé à changer le mot de passe de ton compte BELFIT. " +
      "Appuie sur le bouton ci-dessous — le lien reste valable 1 heure.",
    bouton: "Choisir un nouveau mot de passe",
    rassure: "Tu n'es pas à l'origine de cette demande ?<br>" +
      "Ignore ce message, ton mot de passe reste inchangé.",
    slogan: "Ton coach nutrition et entraînement",
    pied: "Nous écrire",
  },
  en: {
    objet: "Reset your BELFIT password",
    titre: "Reset your password",
    intro: "You asked to change the password of your BELFIT account. " +
      "Tap the button below — the link stays valid for 1 hour.",
    bouton: "Choose a new password",
    rassure: "Didn't request this?<br>Just ignore this message, " +
      "your password stays unchanged.",
    slogan: "Your nutrition and training coach",
    pied: "Contact us",
  },
  nl: {
    objet: "Stel je BELFIT-wachtwoord opnieuw in",
    titre: "Stel je wachtwoord opnieuw in",
    intro: "Je vroeg om het wachtwoord van je BELFIT-account te wijzigen. " +
      "Tik op de knop hieronder — de link blijft 1 uur geldig.",
    bouton: "Kies een nieuw wachtwoord",
    rassure: "Heb je dit niet aangevraagd?<br>" +
      "Negeer dit bericht, je wachtwoord blijft ongewijzigd.",
    slogan: "Jouw coach voor voeding en training",
    pied: "Contacteer ons",
  },
};

/** Confirmation d'adresse, en trois langues. */
const TEXTES_VERIF = {
  fr: {
    objet: "Confirme ton adresse — BELFIT",
    titre: "Plus qu'une étape",
    intro: "Bienvenue chez BELFIT. Confirme ton adresse e-mail pour " +
      "débloquer ton programme — le lien reste valable 24 heures.",
    bouton: "Confirmer mon adresse",
    rassure: "Tu n'es pas à l'origine de cette inscription ?<br>" +
      "Ignore ce message, aucun compte ne sera activé.",
    slogan: "Ton coach nutrition et entraînement",
    pied: "Nous écrire",
  },
  en: {
    objet: "Confirm your email — BELFIT",
    titre: "One last step",
    intro: "Welcome to BELFIT. Confirm your email address to unlock " +
      "your programme — the link stays valid for 24 hours.",
    bouton: "Confirm my email",
    rassure: "Didn't sign up?<br>Just ignore this message, " +
      "no account will be activated.",
    slogan: "Your nutrition and training coach",
    pied: "Contact us",
  },
  nl: {
    objet: "Bevestig je e-mailadres — BELFIT",
    titre: "Nog één stap",
    intro: "Welkom bij BELFIT. Bevestig je e-mailadres om je programma " +
      "te ontgrendelen — de link blijft 24 uur geldig.",
    bouton: "Mijn adres bevestigen",
    rassure: "Heb je je niet ingeschreven?<br>" +
      "Negeer dit bericht, er wordt geen account geactiveerd.",
    slogan: "Jouw coach voor voeding en training",
    pied: "Contacteer ons",
  },
};

/** Construit le message HTML. Tables + styles en ligne : seule
 *  mise en forme fiable dans les clients de messagerie. */
function modeleMail(lien, langue, jeu) {
  const J = jeu || TEXTES;
  const T = J[langue] || J.fr;
  return `<!DOCTYPE html>
<html lang="${langue}"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F6F8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F6F8;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden;">
  <tr><td align="center" style="background:#141414;padding:30px 24px 26px;">
    <div style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:27px;font-weight:800;letter-spacing:2px;color:#FFFFFF;">BEL<span style="color:#F7B500;">FIT</span></div>
    <div style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:12.5px;color:#9C968A;margin-top:7px;">${T.slogan}</div>
  </td></tr>
  <tr><td style="padding:32px 30px 8px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
    <div style="font-size:20px;font-weight:800;color:#181818;line-height:1.35;margin-bottom:14px;">${T.titre}</div>
    <div style="font-size:14.5px;color:#5C5750;line-height:1.65;">${T.intro}</div>
  </td></tr>
  <tr><td align="center" style="padding:26px 30px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" style="background:#F7B500;border-radius:14px;">
        <a href="${lien}" style="display:block;padding:16px 40px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:800;color:#181818;text-decoration:none;">${T.bouton}</a>
      </td></tr></table>
  </td></tr>
  <tr><td style="padding:22px 30px 30px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
    <div style="font-size:13px;color:#8A8580;line-height:1.6;text-align:center;">${T.rassure}</div>
  </td></tr>
  <tr><td style="background:#FAF9F5;border-top:1px solid #EFEBE1;padding:20px 30px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
    <div style="font-size:12px;color:#9C968A;line-height:1.6;text-align:center;">
      BELFIT &middot; Startup belge<br>
      <a href="https://belfit.be" style="color:#8F6200;text-decoration:none;font-weight:600;">belfit.be</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:contact@belfit.be" style="color:#8F6200;text-decoration:none;font-weight:600;">${T.pied}</a>
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ---------------------------------------------------------------
// Confirmation d'adresse a l'inscription.
// Meme chaine que la reinitialisation : Firebase signe le jeton,
// nous envoyons le message et hebergeons la page d'arrivee.
// Ici l'appel exige un jeton de session : sans cela l'adresse
// serait libre, et l'endpoint deviendrait un relais a courriels.
// ---------------------------------------------------------------
exports.mailVerification = onRequest(
  {secrets: [RESEND_API_KEY], region: "europe-west1", cors: true},
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ok: false}); return; }

    try {
      const entete = req.get("Authorization") || "";
      const jetonSession = entete.startsWith("Bearer ") ? entete.slice(7) : "";
      if (!jetonSession) { res.status(401).json({ok: false}); return; }

      let compte;
      try {
        const decode = await admin.auth().verifyIdToken(jetonSession);
        compte = await admin.auth().getUser(decode.uid);
      } catch (e) {
        res.status(401).json({ok: false}); return;
      }

      // Deja confirme : inutile d'envoyer quoi que ce soit.
      if (compte.emailVerified) { res.json({ok: true, deja: true}); return; }
      if (!compte.email) { res.status(400).json({ok: false}); return; }

      // Garde-fou : un envoi par minute. Sans cela, un clic repete sur
      // « renvoyer » suffirait a inonder une boite et a abimer notre
      // reputation d'expediteur.
      const ref = db.collection("users").doc(compte.uid);
      const snap = await ref.get();
      const dernier = snap.exists && snap.data().dernierMailVerif;
      if (dernier && Date.now() - dernier.toMillis() < 60000) {
        res.status(429).json({ok: false, attendre: true}); return;
      }

      const langue = String((req.body && req.body.langue) || "fr").slice(0, 2);

      let lien = await admin.auth()
        .generateEmailVerificationLink(compte.email);
      try {
        const jeton = new URL(lien).searchParams.get("oobCode");
        if (jeton) {
          lien = `${PAGE_VERIF}?code=${encodeURIComponent(jeton)}` +
            `&lang=${encodeURIComponent(langue)}`;
        }
      } catch (e) {
        console.error("Lien Firebase illisible :", e);
      }

      const T = TEXTES_VERIF[langue] || TEXTES_VERIF.fr;
      const envoi = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EXPEDITEUR,
          reply_to: REPONSE_A,
          to: [compte.email],
          subject: T.objet,
          html: modeleMail(lien, langue, TEXTES_VERIF),
        }),
      });

      if (!envoi.ok) {
        console.error("Resend a refuse l'envoi :", await envoi.text());
        res.status(502).json({ok: false});
        return;
      }
      await ref.set({
        dernierMailVerif: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      res.json({ok: true});
    } catch (e) {
      console.error("mailVerification :", e);
      res.status(500).json({ok: false});
    }
  },
);

exports.mailReinitialisation = onRequest(
  {secrets: [RESEND_API_KEY], region: "europe-west1", cors: true},
  async (req, res) => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ok: false}); return; }

    try {
      const email = String((req.body && req.body.email) || "").trim();
      const langue = String((req.body && req.body.langue) || "fr").slice(0, 2);
      if (!email || email.indexOf("@") === -1) {
        res.status(400).json({ok: false});
        return;
      }

      // Lien officiel Firebase (jeton signe, expiration geree par Firebase).
      let lien;
      try {
        lien = await admin.auth().generatePasswordResetLink(email);
      } catch (e) {
        // Compte inexistant : on repond OK malgre tout. Repondre
        // differemment revelerait quelles adresses sont inscrites.
        res.json({ok: true});
        return;
      }

      // Firebase pointe vers repz-baf60.firebaseapp.com : une adresse
      // etrangere au site, qui inquiete a juste titre. On ne garde que
      // le jeton et on renvoie vers notre propre page, sur belfit.be.
      // Si le jeton est introuvable, on laisse le lien Firebase :
      // moins beau, mais l'utilisateur peut quand meme se depanner.
      try {
        const jeton = new URL(lien).searchParams.get("oobCode");
        if (jeton) {
          lien = `${PAGE_REINIT}?code=${encodeURIComponent(jeton)}` +
            `&lang=${encodeURIComponent(langue)}`;
        }
      } catch (e) {
        console.error("Lien Firebase illisible :", e);
      }

      const T = TEXTES[langue] || TEXTES.fr;
      const envoi = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EXPEDITEUR,
          reply_to: REPONSE_A,
          to: [email],
          subject: T.objet,
          html: modeleMail(lien, langue),
        }),
      });

      if (!envoi.ok) {
        console.error("Resend a refuse l'envoi :", await envoi.text());
        res.status(502).json({ok: false});
        return;
      }
      res.json({ok: true});
    } catch (e) {
      console.error("mailReinitialisation :", e);
      res.status(500).json({ok: false});
    }
  },
);

// ============================================================
// PROGRAMME DU COACH — depot et notification.
//
// Une seule action cote coach, deux canaux cote client : le plan
// est ecrit dans users/{uid}.programme (l'app le lit et propose de
// l'appliquer au journal) ET envoye par courriel.
//
// La verification « suis-je coach ? » est faite ICI, cote serveur.
// Si elle vivait dans la page, n'importe qui pourrait ecrire un
// programme chez n'importe quel autre compte : la page n'est qu'une
// commodite, la regle est ce fichier.
//
// Qui est coach ? Une liste d'adresses ecrite ICI, dans le code.
// Choix assume : une liste en base serait plus souple, mais elle
// obligerait a manipuler des identifiants techniques dans la
// console. Ici, ajouter un coach = ajouter une ligne ci-dessous et
// redeployer. La liste n'est jamais exposee au client — ce fichier
// tourne sur le serveur.
//
// L'adresse doit etre CONFIRMEE : sans cela, quelqu'un pourrait
// creer un compte avec l'adresse d'un coach sans y avoir acces et
// recuperer le droit de deposer.
// ============================================================

/** Adresses autorisees a deposer un programme. */
const COACHS = [
  "coach@belfit.be",
  "contact@belfit.be",
];

/** Vrai si ce compte a le droit de deposer un programme. */
function estCoachAutorise(compte) {
  if (!compte || !compte.email || !compte.emailVerified) return false;
  return COACHS.includes(compte.email.toLowerCase());
}

/** Page de destination annoncee dans le courriel. */
const PAGE_APP = "https://belfit.be/v2/";

/** Modele du courriel « ton programme est pret », en trois langues. */
const TEXTES_PROG = {
  fr: {
    objet: "Ton programme BELFIT est prêt",
    titre: "Ton programme est prêt",
    intro: "Ton coach a terminé ton plan alimentaire. Voici tes " +
      "objectifs quotidiens — ils t'attendent aussi dans l'application, " +
      "où un bouton les applique à ton journal en une fois.",
    bouton: "Ouvrir dans l'application",
    rassure: "Une question sur ton plan ?<br>Réponds simplement à ce message.",
    slogan: "Ton coach nutrition et entraînement",
    pied: "Nous écrire",
    kcal: "calories par jour", prot: "protéines",
    carbs: "glucides", lip: "lipides", note: "Note de ton coach",
  },
  en: {
    objet: "Your BELFIT programme is ready",
    titre: "Your programme is ready",
    intro: "Your coach has finished your nutrition plan. Here are your " +
      "daily targets — they are waiting in the app too, where one button " +
      "applies them to your journal.",
    bouton: "Open in the app",
    rassure: "A question about your plan?<br>Just reply to this message.",
    slogan: "Your nutrition and training coach",
    pied: "Contact us",
    kcal: "calories per day", prot: "protein",
    carbs: "carbs", lip: "fat", note: "Note from your coach",
  },
  nl: {
    objet: "Je BELFIT-programma is klaar",
    titre: "Je programma is klaar",
    intro: "Je coach heeft je voedingsplan afgerond. Dit zijn je " +
      "dagelijkse doelen — ze staan ook in de app, waar één knop ze " +
      "in je dagboek toepast.",
    bouton: "Openen in de app",
    rassure: "Een vraag over je plan?<br>Antwoord gewoon op dit bericht.",
    slogan: "Jouw coach voor voeding en training",
    pied: "Contacteer ons",
    kcal: "calorieën per dag", prot: "eiwitten",
    carbs: "koolhydraten", lip: "vetten", note: "Notitie van je coach",
  },
};

/** Message HTML du programme. Tables + styles en ligne, comme les
 *  autres modeles : seule mise en forme fiable en messagerie. */
function modeleProgramme(prog, langue) {
  const T = TEXTES_PROG[langue] || TEXTES_PROG.fr;
  const e = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const macro = (val, lb) => `
    <td align="center" style="padding:0 4px">
      <div style="font:700 21px/1 Helvetica,Arial,sans-serif;color:#16130F">${e(val)}</div>
      <div style="font:400 11px/1.4 Helvetica,Arial,sans-serif;color:#8A8279;padding-top:4px">${e(lb)}</div>
    </td>`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F4F3F0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3F0;padding:28px 16px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="max-width:520px;background:#FFFFFF;border:1px solid rgba(28,24,18,.06);border-radius:18px">
    <tr><td style="padding:28px 26px 6px">
      <div style="font:700 22px/1.2 Helvetica,Arial,sans-serif;color:#16130F;letter-spacing:-.5px">${e(T.titre)}</div>
      <p style="font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#57514A;margin:12px 0 0">${e(T.intro)}</p>
    </td></tr>
    <tr><td style="padding:20px 20px 4px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:#1E232D;border-radius:14px">
        <tr><td style="padding:18px 10px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center">
              <div style="font:700 30px/1 Helvetica,Arial,sans-serif;color:#F4F6F8">${e(prog.kcal)}</div>
              <div style="font:400 11px/1.4 Helvetica,Arial,sans-serif;color:#AAB1BC;padding-top:5px">${e(T.kcal)}</div>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:14px 20px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${macro(prog.prot + " g", T.prot)}
        ${macro(prog.carbs + " g", T.carbs)}
        ${macro(prog.lip + " g", T.lip)}
      </tr></table>
    </td></tr>
    ${(prog.repas || []).map((r) => `
    <tr><td style="padding:22px 22px 0">
      <div style="font:600 10px/1 Helvetica,Arial,sans-serif;color:#B34700;letter-spacing:1.4px">${e(r.nom).toUpperCase()}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:9px">
        ${r.ings.map((i) => `
        <tr>
          <td style="font:400 14px/1.5 Helvetica,Arial,sans-serif;color:#16130F;padding:5px 0;border-bottom:1px solid rgba(28,24,18,.07)">${e(i.name)}</td>
          <td align="right" style="font:600 14px/1.5 Helvetica,Arial,sans-serif;color:#57514A;padding:5px 0;border-bottom:1px solid rgba(28,24,18,.07);white-space:nowrap">${e(i.portion)}</td>
        </tr>`).join("")}
      </table>
    </td></tr>`).join("")}
    ${prog.note ? `<tr><td style="padding:20px 26px 0">
      <div style="font:600 10px/1 Helvetica,Arial,sans-serif;color:#B34700;letter-spacing:1.4px">${e(T.note).toUpperCase()}</div>
      <p style="font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#57514A;margin:8px 0 0">${e(prog.note)}</p>
    </td></tr>` : ""}
    <tr><td align="center" style="padding:24px 26px 6px">
      <a href="${PAGE_APP}" style="display:inline-block;background:#1E232D;color:#F4F6F8;
         font:600 15px/1 Helvetica,Arial,sans-serif;text-decoration:none;
         padding:15px 26px;border-radius:13px">${e(T.bouton)}</a>
    </td></tr>
    <tr><td align="center" style="padding:18px 26px 26px">
      <p style="font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8A8279;margin:0">${T.rassure}</p>
    </td></tr>
  </table>
  <p style="font:400 11px/1.6 Helvetica,Arial,sans-serif;color:#8A8279;margin:16px 0 0">
    BELFIT — ${e(T.slogan)}<br>
    <a href="mailto:${REPONSE_A}" style="color:#B34700">${e(T.pied)}</a>
  </p>
</td></tr></table></body></html>`;
}

/** Nombre fini et positif, borne — un plan a 90 000 kcal est une
 *  faute de frappe, pas un objectif. */
function nombreValide(v, min, max) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
}

/** Depot d'un programme chez un client (27/09) : partage par
 *  deposerProgramme (compte coach) et espaceCoach (code coach).
 *  Renvoie [statut HTTP, reponse]. */
/** Compte BELFIT designe par « uid:… », un e-mail ou un pseudo. */
async function trouverCompte(cible) {
  let client = null;
  if (cible.startsWith("uid:")) {
    try { client = await admin.auth().getUser(cible.slice(4)); }
    catch (e) { client = null; }
  } else if (cible.includes("@")) {
    try { client = await admin.auth().getUserByEmail(cible.toLowerCase()); }
    catch (e) { client = null; }
  } else {
    // La table des pseudos n'est pas lisible cote client, mais
    // l'admin SDK la traverse : meme chemin que connexionParPseudo.
    const p = await db.collection("usernames").doc(cible.toLowerCase()).get();
    if (p.exists && p.data().uid) {
      try { client = await admin.auth().getUser(p.data().uid); }
      catch (e) { client = null; }
    }
  }
  return client;
}

async function deposerChez(corps, parCoach) {
  // 3. Quel client ? Par courriel ou par pseudo, au choix.
  const cible = String((corps && corps.client) || "").trim();
  if (!cible) { return [400, {ok: false, motif: "client"}]; }
  const client = await trouverCompte(cible);
  if (!client) { return [404, {ok: false, motif: "introuvable"}]; }

  // 4. Le plan tient-il debout ?
  const b = corps || {};
  const prog = {
    kcal: nombreValide(b.kcal, 800, 8000),
    prot: nombreValide(b.prot, 20, 600),
    carbs: nombreValide(b.carbs, 20, 1200),
    lip: nombreValide(b.lip, 10, 400),
  };
  if (prog.kcal === null || prog.prot === null ||
      prog.carbs === null || prog.lip === null) {
    return [400, {ok: false, motif: "valeurs"}];
  }
  // Les repas : c'est le programme lui-meme. Les totaux ci-dessus
  // en sont la consequence, calcules par la page a partir de la
  // meme base d'aliments que l'app — on ne les recalcule pas ici,
  // on les borne seulement.
  const repasBruts = Array.isArray(b.repas) ? b.repas : [];
  const repas = repasBruts.slice(0, 12).map((r) => ({
    nom: String((r && r.nom) || "Repas").slice(0, 60),
    ings: (Array.isArray(r && r.ings) ? r.ings : []).slice(0, 40)
      .map((i) => ({
        name: String((i && i.name) || "").slice(0, 90),
        portion: Math.max(0, Math.round(Number(i && i.portion) || 0)),
      }))
      .filter((i) => i.name && i.portion > 0),
  })).filter((r) => r.ings.length);

  if (!repas.length) {
    return [400, {ok: false, motif: "repas"}];
  }
  prog.repas = repas;
  prog.note = String(b.note || "").slice(0, 600);
  prog.livreLe = new Date().toISOString();
  prog.parCoach = parCoach;

  // 5. Ecriture. C'est le seul chemin : la regle Firestore
  //    interdit au client de toucher ce champ lui-meme.
  await db.collection("users").doc(client.uid).set(
    {programme: prog}, {merge: true},
  );

  // 6. Courriel. Un echec d'envoi ne doit PAS annuler le depot :
  //    le plan est deja dans l'app, c'est le canal qui fait foi.
  let mailEnvoye = false;
  if (client.email) {
    const langue = String(b.langue || "fr").slice(0, 2);
    const T = TEXTES_PROG[langue] || TEXTES_PROG.fr;
    try {
      const envoi = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EXPEDITEUR,
          reply_to: "coach@belfit.be",
          to: [client.email],
          subject: T.objet,
          html: modeleProgramme(prog, langue),
        }),
      });
      mailEnvoye = envoi.ok;
      if (!envoi.ok) console.error("Resend a refuse :", await envoi.text());
    } catch (e) {
      console.error("Envoi du programme :", e);
    }
  }

  return [200, {
    ok: true,
    client: {uid: client.uid, email: client.email || null},
    mailEnvoye,
  }];
}

exports.deposerProgramme = onRequest(
  {secrets: [RESEND_API_KEY], region: "europe-west1", cors: true},
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ok: false}); return; }

    try {
      // 1. Qui appelle ?
      const entete = req.get("Authorization") || "";
      const jeton = entete.startsWith("Bearer ") ? entete.slice(7) : "";
      if (!jeton) { res.status(401).json({ok: false}); return; }

      let coach;
      try {
        const decode = await admin.auth().verifyIdToken(jeton);
        coach = await admin.auth().getUser(decode.uid);
      } catch (e) {
        res.status(401).json({ok: false}); return;
      }

      // 2. Est-il coach ? Adresse dans la liste ET confirmee.
      if (!estCoachAutorise(coach)) {
        res.status(403).json({ok: false, motif: "acces"}); return;
      }

      const [statut, rep] = await deposerChez(req.body, coach.uid);
      res.status(statut).json(rep);
    } catch (e) {
      console.error("deposerProgramme :", e);
      res.status(500).json({ok: false});
    }
  },
);

// ============================================================
// ESPACE COACH (27/09) : la plateforme de Raci, SANS compte BELFIT.
//
// Acces par un code personnel (secret COACH_CODE, pose par le
// deploiement automatique depuis le secret GitHub du meme nom). La
// page le garde sur l'appareil ; chaque appel le renvoie et il est
// verifie ICI : la page seule ne peut rien lire ni ecrire.
//   action "verifier" : le code est-il bon ?
//   action "dossiers" : questionnaires recus, a traiter ou livres
//   action "proposer" : brouillon de plan par l'IA (Gemini), relu par Raci
//   action "deposer"  : programme vers un client (app + e-mail)
// ============================================================

const COACH_CODE = defineSecret("COACH_CODE");

/** Comparaison a temps constant : la duree ne trahit pas le code. */
function codeCoachValide(saisi) {
  const attendu = String(COACH_CODE.value() || "");
  if (!attendu || !saisi) return false;
  const h = (x) => crypto.createHash("sha256").update(String(x)).digest();
  return crypto.timingSafeEqual(h(saisi), h(attendu));
}

/** Freinage des essais : par adresse IP, sur l'instance en cours. */
const essaisCoach = new Map();
function tropDEssais(ip) {
  const maintenant = Date.now();
  const e = essaisCoach.get(ip) || {n: 0, depuis: maintenant};
  if (maintenant - e.depuis > 15 * 60 * 1000) { e.n = 0; e.depuis = maintenant; }
  essaisCoach.set(ip, e);
  return e.n >= 8;
}

/** Texte lisible d'une reponse du questionnaire, ou "". */
function reponseTexte(reponses, id) {
  const r = reponses && reponses[id];
  return r ? String(r.texte || r.valeur || "").slice(0, 120) : "";
}

/** Besoins du jour d'apres le questionnaire (Mifflin-St Jeor, comme
 *  le calcul de l'app). Sert de cible a l'IA ; le coach tranche. */
function besoinsDe(rep) {
  const v = (id) => (rep[id] || {}).valeur;
  const n = (id) => parseFloat(String(v(id) || "").replace(",", "."));
  const poids = n("poids"), taille = n("taille"), age = n("age");
  if (!(poids > 30) || !(taille > 120) || !(age > 10)) return null;
  const homme = v("sexe") !== "Femme";
  const bmr = 10 * poids + 6.25 * taille - 5 * age + (homme ? 5 : -161);
  const base = {"Assis la plupart de la journée": 1.2,
    "Debout ou marche au travail": 1.375, "Métier physique": 1.55}[v("activite")] || 1.3;
  const seances = Math.min(14, Math.max(0, n("seances") || 0));
  const facteur = Math.min(2.2, base + seances * 0.03);
  const ajust = {"Perdre du gras": -400, "Prendre du muscle": 300,
    "Recomposition": -150}[v("objectif")] || 0;
  const kcal = Math.round((bmr * facteur + ajust) / 10) * 10;
  const prot = Math.round(poids * (v("objectif") === "Prendre du muscle" ? 2.0 : 1.8));
  const lip = Math.round(kcal * 0.27 / 9);
  const carbs = Math.max(0, Math.round((kcal - prot * 4 - lip * 9) / 4));
  return {kcal, prot, carbs, lip};
}

/** Appel Gemini en JSON, avec la meme liste de repli que le reste. */
async function geminiJSON(prompt) {
  const MODELES = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
  const corps = {
    contents: [{parts: [{text: prompt}]}],
    generationConfig: {temperature: 0.4, responseMimeType: "application/json"},
  };
  let dernier = "";
  for (const modele of MODELES) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
      modele + ":generateContent?key=" + GEMINI_API_KEY.value();
    const r = await fetch(url, {method: "POST",
      headers: {"Content-Type": "application/json"}, body: JSON.stringify(corps)});
    if (r.ok) {
      const d = await r.json();
      const t = d.candidates && d.candidates[0] && d.candidates[0].content &&
        d.candidates[0].content.parts && d.candidates[0].content.parts[0].text || "{}";
      return JSON.parse(String(t).replace(/```json|```/g, "").trim());
    }
    dernier = (await r.text()).slice(0, 200);
    console.error("Gemini (coach)", modele, r.status, dernier);
    if (r.status === 402) { const e = new Error("credit"); e.credit = true; throw e; }
    if (r.status !== 404) break;
  }
  throw new Error("gemini: " + dernier);
}

/** Brouillon de plan par l'IA, a partir du questionnaire et/ou d'une
 *  demande du coach. Seuls les aliments de la base de l'app sont gardes. */
async function proposerPlan(corps) {
  const liste = Array.isArray(corps.aliments) ? corps.aliments.slice(0, 2500).map(String) : [];
  const noms = new Map();
  liste.forEach((l) => { const nom = l.split(";")[0]; if (nom) noms.set(nom, /pièce=/.test(l)); });
  if (!noms.size) return [400, {ok: false, motif: "aliments"}];

  let reponses = null;
  if (corps.uid) {
    const doc = await db.collection("users").doc(String(corps.uid)).get();
    reponses = doc.exists && doc.data().questionnaireCoach ? doc.data().questionnaireCoach.reponses || {} : null;
  }
  const actuel = Array.isArray(corps.planActuel) ? corps.planActuel.slice(0, 10) : [];
  const demande = String(corps.demande || "").slice(0, 600).trim();
  if (!reponses && !actuel.length) return [400, {ok: false, motif: "vide"}];

  const cible = reponses ? besoinsDe(reponses) : null;
  const nbRepas = reponses ? parseInt((reponses.repasVoulus || {}).valeur, 10) || 3 : null;
  const lignesRep = reponses ? Object.values(reponses)
    .filter((r) => r && r.question && r.texte && r.texte !== "—")
    .map((r) => "- " + r.question + " : " + r.texte).join("\n") : "";

  const prompt = [
    "Tu es l'assistant d'un coach en nutrition belge. Tu prepares un BROUILLON de plan alimentaire",
    "pour une journee type. Le coach le relit et le corrige avant de l'envoyer.",
    cible ? `CIBLE DU JOUR : ${cible.kcal} kcal, ${cible.prot} g de proteines, ${cible.carbs} g de glucides, ${cible.lip} g de lipides.` : "",
    nbRepas ? `NOMBRE DE REPAS : ${nbRepas} (tu peux ajouter une collation si c'est utile).` : "",
    lignesRep ? "REPONSES DU CLIENT AU QUESTIONNAIRE :\n" + lignesRep : "",
    actuel.length ? "PLAN ACTUEL (a modifier selon la demande du coach, garde ce qui n'est pas concerne) :\n" + JSON.stringify(actuel) : "",
    demande ? "DEMANDE DU COACH (prioritaire) : " + demande : "",
    "REGLES STRICTES :",
    "- Utilise UNIQUEMENT des aliments de la LISTE ci-dessous, avec leur nom EXACT, caractere pour caractere.",
    "- Construis le plan EN PRIORITE avec les aliments preferes coches par le client (Tes aliments preferes), rattaches a leur nom exact dans la LISTE ; n'en ajoute d'autres que si c'est necessaire.",
    "- Exclus tout aliment lie a une allergie ou intolerance declaree, tout aliment refuse, et respecte le regime declare (halal, sans porc, vegetarien, vegan...).",
    "- portion = grammes ; pour les aliments marques « pièce=Ng », portion = nombre de pieces.",
    "- Des repas simples, courants en Belgique, adaptes au temps de cuisine, au materiel et au rythme declares.",
    cible ? "- Vise la cible a 5 % pres, surtout pour les calories et les proteines." : "",
    "- Noms de repas en francais (Petit-dejeuner, Dejeuner, Collation, Diner...).",
    "Reponds UNIQUEMENT avec ce JSON : {\"repas\":[{\"nom\":\"...\",\"ings\":[{\"name\":\"...\",\"portion\":nombre}]}],\"remarque\":\"une phrase pour le coach : points d'attention, allergies, choix faits\"}",
    "LISTE (nom;kcal;proteines;glucides;lipides pour 100 g) :",
    liste.join("\n"),
  ].filter(Boolean).join("\n");

  let brut;
  try { brut = await geminiJSON(prompt); } catch (e) {
    // Credit prepaye Gemini epuise (27/09) : a recharger dans AI Studio.
    if (e.credit) return [402, {ok: false, motif: "credit"}];
    throw e;
  }
  const repas = (Array.isArray(brut.repas) ? brut.repas : []).slice(0, 8).map((r) => ({
    nom: String((r && r.nom) || "Repas").slice(0, 60),
    ings: (Array.isArray(r && r.ings) ? r.ings : []).slice(0, 14)
      .filter((i) => i && noms.has(String(i.name)))
      .map((i) => {
        const piece = noms.get(String(i.name));
        const q = Number(i.portion) || 0;
        return {name: String(i.name), portion: piece ? Math.min(20, Math.max(1, Math.round(q))) : Math.min(1500, Math.max(5, Math.round(q / 5) * 5))};
      }),
  })).filter((r) => r.ings.length);
  if (!repas.length) return [502, {ok: false, motif: "ia"}];
  return [200, {ok: true, repas, cible, remarque: String(brut.remarque || "").slice(0, 400)}];
}

exports.espaceCoach = onRequest(
  {secrets: [RESEND_API_KEY, COACH_CODE, GEMINI_API_KEY], region: "europe-west1", cors: true, timeoutSeconds: 120},
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ok: false}); return; }

    const ip = String(req.get("x-forwarded-for") || req.ip || "?").split(",")[0].trim();
    try {
      const corps = req.body || {};
      if (tropDEssais(ip)) { res.status(429).json({ok: false, motif: "attente"}); return; }
      if (!codeCoachValide(corps.code)) {
        const e = essaisCoach.get(ip); e.n += 1;
        await new Promise((r) => setTimeout(r, 800));
        res.status(403).json({ok: false, motif: "code"}); return;
      }
      essaisCoach.delete(ip);

      const action = String(corps.action || "");
      if (action === "verifier") { res.json({ok: true}); return; }

      if (action === "dossiers") {
        const snap = await db.collection("users")
          .orderBy("questionnaireCoach.envoyeLe", "desc").limit(60).get();
        const docs = snap.docs.map((d) => ({uid: d.id, d: d.data()}));
        const emails = {};
        for (let k = 0; k < docs.length; k += 100) {
          const lot = docs.slice(k, k + 100).map((x) => ({uid: x.uid}));
          if (!lot.length) continue;
          const r = await admin.auth().getUsers(lot);
          r.users.forEach((u) => { emails[u.uid] = u.email || null; });
        }
        const dossiers = docs.map(({uid, d}) => {
          const q = d.questionnaireCoach || {};
          const rep = q.reponses || {};
          const livreLe = (d.programme && d.programme.livreLe) || null;
          return {
            uid,
            email: emails[uid] || null,
            prenom: reponseTexte(rep, "prenom"),
            nom: reponseTexte(rep, "nom"),
            objectif: reponseTexte(rep, "objectif"),
            type: q.type || "plan",
            envoyeLe: q.envoyeLe || null,
            payeLe: (d.commandeCoach && d.commandeCoach.payeLe) || null,
            virement: (d.commandeCoach && d.commandeCoach.virement) || null,
            livreLe,
            aTraiter: !livreLe || (q.envoyeLe && new Date(livreLe) < new Date(q.envoyeLe)),
            alerteSante: !!q.alerteSante,
            allergieGrave: !!q.allergieGrave,
            reponses: rep,
          };
        });
        res.json({ok: true, dossiers});
        return;
      }

      // ----- Acces PRO (28/09) : offert a une adresse, ou code a partager -----
      const MOIS = {"1m": 1, "3m": 3, "illimite": null};
      if (action === "offrirAcces") {
        const cible = String(corps.client || "").trim();
        if (!cible || !(corps.duree in MOIS)) { res.status(400).json({ok: false, motif: "donnees"}); return; }
        const compte = await trouverCompte(cible);
        if (!compte) { res.status(404).json({ok: false, motif: "introuvable"}); return; }
        const mois = MOIS[corps.duree];
        const jusqu = mois ? new Date(Date.now() + mois * 30 * 864e5).toISOString() : null;
        const le = new Date().toISOString();
        await db.collection("users").doc(compte.uid).set({
          accesPro: {jusqu, source: "offert", le},
          premium: true, premiumJusqu: jusqu,
        }, {merge: true});
        await db.collection("accesOfferts").add({uid: compte.uid, email: compte.email || cible, jusqu, duree: corps.duree, le});
        res.json({ok: true, jusqu, email: compte.email || cible});
        return;
      }
      if (action === "creerCode") {
        // « nomCode » : « code » est deja le code d'acces de l'espace coach.
        const code = String(corps.nomCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const max = Math.max(1, Math.min(1000, parseInt(corps.max, 10) || 1));
        if (code.length < 4 || code.length > 32 || !(corps.duree in MOIS)) { res.status(400).json({ok: false, motif: "donnees"}); return; }
        const ref = db.collection("codesPremium").doc(code);
        if ((await ref.get()).exists) { res.status(409).json({ok: false, motif: "existe"}); return; }
        await ref.set({mois: MOIS[corps.duree], max, utilisations: 0, uids: [], cree: new Date().toISOString(), parCoach: true});
        res.json({ok: true, code});
        return;
      }
      if (action === "acces") {
        const codes = (await db.collection("codesPremium").orderBy("cree", "desc").limit(50).get()).docs
          .map((d) => ({code: d.id, mois: d.data().mois || null, max: d.data().max || 1,
            utilisations: d.data().utilisations != null ? d.data().utilisations : (d.data().utilise ? 1 : 0)}));
        const offerts = (await db.collection("accesOfferts").orderBy("le", "desc").limit(30).get()).docs
          .map((d) => ({email: d.data().email, jusqu: d.data().jusqu || null, le: d.data().le}));
        res.json({ok: true, codes, offerts});
        return;
      }

      // ----- Invitations par lien (02/10) : paiement gere hors app -----
      if (action === "creerInvitation") {
        const type = corps.type === "maj" ? "maj" : "plan";
        const note = String(corps.note || "").trim().slice(0, 80);
        const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let essai = 0; essai < 5; essai++) {
          code = Array.from(crypto.randomBytes(8)).map((b) => ALPHA[b % ALPHA.length]).join("");
          if (!(await db.collection("invitations").doc(code).get()).exists) break;
        }
        await db.collection("invitations").doc(code).set({type, note, cree: new Date().toISOString(), utilisePar: null});
        res.json({ok: true, code, type, lien: "https://belfit.be/?invitation=" + code});
        return;
      }
      if (action === "virementRecu") {
        const uid = String(corps.uid || "");
        if (!uid) { res.status(400).json({ok: false, motif: "donnees"}); return; }
        const ref = db.collection("users").doc(uid);
        const sn = await ref.get();
        const cmd = sn.exists ? sn.data().commandeCoach : null;
        if (!cmd || !cmd.virement) { res.status(404).json({ok: false, motif: "introuvable"}); return; }
        const le = new Date().toISOString();
        await ref.set({commandeCoach: {virement: {statut: "recu", recuLe: le}}}, {merge: true});
        const refQ = db.collection("quotasIA").doc(uid);
        const sq = await refQ.get();
        const fin = sq.exists && sq.data().illimiteJusqu ? Date.parse(sq.data().illimiteJusqu) : 0;
        const base = Math.max(Date.now(), fin || 0);
        await refQ.set({illimiteJusqu: new Date(base + IA_JOURS_COACHING * 864e5).toISOString()}, {merge: true});
        if (cmd.commande) await db.collection("invitations").doc(cmd.commande).set({virementRecuLe: le}, {merge: true});
        res.json({ok: true, recuLe: le});
        return;
      }
      if (action === "invitations") {
        const liste = (await db.collection("invitations").orderBy("cree", "desc").limit(30).get()).docs
            .map((d) => ({code: d.id, type: d.data().type, note: d.data().note || "",
              cree: d.data().cree, utiliseLe: d.data().utiliseLe || null, email: d.data().email || null}));
        res.json({ok: true, invitations: liste});
        return;
      }

      if (action === "proposer") {
        const [statut, rep] = await proposerPlan(corps);
        res.status(statut).json(rep);
        return;
      }

      if (action === "deposer") {
        const [statut, rep] = await deposerChez(corps, "espace-coach");
        res.status(statut).json(rep);
        return;
      }

      res.status(400).json({ok: false, motif: "action"});
    } catch (e) {
      console.error("espaceCoach :", e);
      res.status(500).json({ok: false, detail: String((e && e.message) || e).slice(0, 200)});
    }
  },
);

// ============================================================
// INVITATION PAR LIEN (02/10).
// Le coach envoie belfit.be/?invitation=CODE ; la personne cree son
// compte, l'app appelle cette fonction. Elle ecrit la commande coaching
// (comme un paiement : le questionnaire s'ouvre) et l'IA illimitee
// 30 jours. Un lien ne sert qu'a un seul compte.
// ============================================================
exports.utiliserInvitation = onRequest(
    {region: "europe-west1", cors: true},
    async (req, res) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") { res.status(204).send(""); return; }
      if (req.method !== "POST") { res.status(405).json({ok: false}); return; }
      try {
        const h = req.get("Authorization") || "";
        const token = h.startsWith("Bearer ") ? h.slice(7) : "";
        let uid; let email = null;
        try { const d = await admin.auth().verifyIdToken(token); uid = d.uid; email = d.email || null; } catch (e) { res.status(401).json({ok: false, motif: "auth"}); return; }
        const code = String((req.body || {}).code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (code.length < 6) { res.status(400).json({ok: false, motif: "code"}); return; }
        const ref = db.collection("invitations").doc(code);
        const resultat = await db.runTransaction(async (tx) => {
          const s2 = await tx.get(ref);
          if (!s2.exists) return {ok: false, motif: "inconnue"};
          const inv = s2.data();
          if (inv.utilisePar && inv.utilisePar !== uid) return {ok: false, motif: "utilisee"};
          if (inv.utilisePar === uid) return {ok: true, type: inv.type, deja: true};
          const le = new Date().toISOString();
          tx.set(ref, {utilisePar: uid, utiliseLe: le, email}, {merge: true});
          // Virement (02/10) : le questionnaire s'ouvre tout de suite, le
          // coach marque « Virement recu » depuis l'espace coach.
          const montant = inv.type === "maj" ? 60 : 80;
          tx.set(db.collection("users").doc(uid), {
            commandeCoach: {type: inv.type || "plan", payeLe: le, source: "invitation", commande: code,
              virement: {statut: "attente", montant, communication: code}},
          }, {merge: true});
          return {ok: true, type: inv.type || "plan"};
        });
        // IA illimitee : a la reception du virement, pas a l'ouverture du lien.
        res.status(resultat.ok ? 200 : 409).json(resultat);
      } catch (e) {
        console.error("utiliserInvitation :", e);
        res.status(500).json({ok: false, motif: "serveur"});
      }
    },
);

// ============================================================
// DEMANDE D'AJUSTEMENT.
//
// Le client ne modifie pas son programme : il en demande un autre.
// 21/10 Raci : ajustements illimites pendant le mois de coaching, plus
// de quota par formule. Le compteur (informatif, pour le coach) est
// remis a zero au changement de mois civil. Il vit
// dans users/{uid}.ajustements, ecrit uniquement par cette fonction :
// les regles Firestore interdisent au client d'y toucher.
// ============================================================

/** Mois civil courant, au format AAAA-MM. */
function moisCourant() {
  const d = new Date();
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

exports.demanderAjustement = onRequest(
  {secrets: [RESEND_API_KEY], region: "europe-west1", cors: true},
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ok: false}); return; }

    try {
      const entete = req.get("Authorization") || "";
      const jeton = entete.startsWith("Bearer ") ? entete.slice(7) : "";
      if (!jeton) { res.status(401).json({ok: false}); return; }

      let compte;
      try {
        const decode = await admin.auth().verifyIdToken(jeton);
        compte = await admin.auth().getUser(decode.uid);
      } catch (e) {
        res.status(401).json({ok: false}); return;
      }

      const ref = db.collection("users").doc(compte.uid);
      const snap = await ref.get();
      const d = snap.exists ? snap.data() : {};

      if (d.premium !== true) {
        res.status(403).json({ok: false, motif: "premium"}); return;
      }

      const mois = moisCourant();
      const suivi = d.ajustements || {};
      const utilises = suivi.mois === mois ? (suivi.utilises || 0) : 0;

      // 21/10 Raci : ajustements illimites pendant le mois de coaching.
      // Plus de blocage : le compteur reste, pour information du coach.

      const message = String((req.body && req.body.message) || "").slice(0, 1000);

      // Le compteur monte AVANT l'envoi : si le courriel echoue, le
      // client peut reessayer, mais une demande partie deux fois
      // couterait deux ajustements. On prefere l'inverse.
      await ref.set({
        ajustements: {mois: mois, utilises: utilises + 1,
          dernierLe: new Date().toISOString()},
      }, {merge: true});

      // Le coach recoit la demande. Reponse directe au client :
      // l'echange continue par courriel, sans intermediaire.
      try {
        const nom = compte.displayName || compte.email || compte.uid;
        const prog = d.programme || null;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: EXPEDITEUR,
            reply_to: compte.email || REPONSE_A,
            to: ["coach@belfit.be"],
            subject: `Demande d'ajustement — ${nom}`,
            html: `<div style="font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#16130F">
              <p><b>${nom}</b> demande un ajustement de son programme.</p>
              <p style="color:#57514A">Compte : ${compte.email || "sans adresse"}<br>
              Formule : ${d.formule || "inconnue"}<br>
              Ajustement n° ${utilises + 1} ce mois-ci</p>
              ${prog ? `<p style="color:#57514A">Programme actuel :
                ${prog.kcal} kcal · ${prog.prot} P · ${prog.carbs} C · ${prog.lip} L</p>` : ""}
              ${message ? `<p style="background:#F4F3F0;padding:12px;border-radius:10px">
                ${message.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>` : ""}
              <p style="color:#8A8279;font-size:12px">Réponds à ce message pour
              écrire directement au client.</p></div>`,
          }),
        });
      } catch (e) {
        console.error("Envoi de la demande :", e);
      }

      res.json({ok: true, restants: null, quota: null});
    } catch (e) {
      console.error("demanderAjustement :", e);
      res.status(500).json({ok: false});
    }
  },
);

/* ============================================================
 * CODES PREMIUM A USAGE UNIQUE
 *
 * Un code vit dans Firestore : codesPremium/{CODE}.
 *   { utilise:false, uid:null, le:null, mois:<n|null>, note:"..." }
 *
 * Trois raisons de passer par une Cloud Function plutot que par le
 * client :
 *   - « une seule fois » se decide au serveur. Deux appareils qui
 *     envoient le meme code a la meme seconde doivent produire un
 *     gagnant et un perdant : c'est le role de la transaction.
 *   - la collection reste fermee au client (regles), donc personne ne
 *     peut lire la liste des codes ni deviner ceux qui restent.
 *   - premium est ecrit en admin, comme pour les webhooks de paiement.
 *     La source de verite reste unique : users/{uid}.
 *
 * Codes en clair dans le JS de la page (V1 : JETAIME, BELFIT1) : c'est
 * exactement ce que ceci remplace.
 * ============================================================ */
exports.utiliserCode = onRequest(
  {region: "europe-west1", cors: false},
  async (req, res) => {
    if (appliquerCors(req, res)) return;
    try {
      const jeton = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!jeton) {
        res.status(401).json({error: "non_authentifie"});
        return;
      }
      const decode = await admin.auth().verifyIdToken(jeton);
      const uid = decode.uid;

      // Normalisation : on accepte « belfit1 », « BelFit 1 », etc.
      const code = String((req.body && req.body.code) || "")
        .toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 4 || code.length > 32) {
        res.status(200).json({ok: false, raison: "inconnu"});
        return;
      }

      const refCode = db.collection("codesPremium").doc(code);
      const refUser = db.collection("users").doc(uid);

      const issue = await db.runTransaction(async (tx) => {
        const snap = await tx.get(refCode);
        if (!snap.exists) return {ok: false, raison: "inconnu"};
        const d = snap.data() || {};

        // Code a plusieurs utilisations (espace coach, 28/09).
        if (d.max) {
          const uids = d.uids || [];
          if (uids.includes(uid)) return {ok: true, raison: "deja_le_tien"};
          if ((d.utilisations || 0) >= d.max) return {ok: false, raison: "epuise"};
          const jusqu2 = d.mois ? new Date(Date.now() + d.mois * 30 * 864e5).toISOString() : null;
          tx.update(refCode, {utilisations: (d.utilisations || 0) + 1, uids: [...uids, uid]});
          tx.set(refUser, {
            premium: true, source: "code", codeUtilise: code, premiumJusqu: jusqu2,
            accesPro: {jusqu: jusqu2, source: "code", code, le: new Date().toISOString()},
          }, {merge: true});
          return {ok: true, raison: "active", jusqu: jusqu2};
        }
        // Deja utilise par quelqu'un d'autre : refus. Deja utilise par
        // CE compte : on ne refuse pas, on confirme — reappuyer sur le
        // bouton ne doit pas ressembler a une erreur.
        if (d.utilise) {
          if (d.uid === uid) return {ok: true, raison: "deja_le_tien"};
          return {ok: false, raison: "deja_utilise"};
        }
        if (d.expire && Date.now() > Date.parse(d.expire)) {
          return {ok: false, raison: "expire"};
        }

        const jusqu = d.mois ?
          new Date(Date.now() + d.mois * 30 * 864e5).toISOString() : null;

        tx.update(refCode, {
          utilise: true,
          uid,
          le: new Date().toISOString(),
        });
        tx.set(refUser, {
          premium: true,
          source: "code",
          codeUtilise: code,
          premiumJusqu: jusqu,
          accesPro: {jusqu, source: "code", code, le: new Date().toISOString()},
        }, {merge: true});

        return {ok: true, raison: "active", jusqu};
      });

      res.status(200).json(issue);
    } catch (err) {
      console.error("utiliserCode", err);
      res.status(500).json({error: "server"});
    }
  },
);
