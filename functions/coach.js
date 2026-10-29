/**
 * Coach BelFit — premiere main : ajouterAliment.
 *
 * Contrat de sortie aligne sur transcrireVocal / analyserPhoto :
 * { aliment, quantite, unite } + repasCle pour savoir OU ecrire.
 * L'ecriture Firestore du journal reste cote client (meme store V2).
 * Cette function ne fait que comprendre et proposer.
 */
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const accesNutrition = require("./acces-nutrition");

// Doit rester egal a PREMIUM_OUVERT dans functions/index.js
// et app-v2/src/acces-libre.js.
const PREMIUM_OUVERT = true;
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const MODELES = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];

function cors(req, res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

async function geminiJson(apiKey, prompt) {
  const body = {
    contents: [{parts: [{text: prompt}]}],
    generationConfig: {temperature: 0.2, responseMimeType: "application/json"},
  };
  let last = "";
  let gRes = null;
  for (const modele of MODELES) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
      modele + ":generateContent?key=" + apiKey;
    gRes = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body),
    });
    if (gRes.ok) {
      console.log("coachAgent modele:", modele);
      break;
    }
    last = (await gRes.text()).slice(0, 300);
    console.error("Gemini", modele, gRes.status, last);
    if (gRes.status !== 404) break;
  }
  if (!gRes || !gRes.ok) {
    const err = new Error("gemini_failed");
    err.detail = last;
    throw err;
  }
  const data = await gRes.json();
  const texte = data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts[0].text || "{}";
  try {
    return JSON.parse(texte);
  } catch (e) {
    console.warn("coachAgent JSON parse fail", texte.slice(0, 200));
    return {texte: "", aliments: []};
  }
}

exports.coachAgent = onRequest(
  {secrets: [GEMINI_API_KEY], region: "europe-west1", cors: true, timeoutSeconds: 60},
  async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== "POST") {
      res.status(405).json({error: "method"});
      return;
    }

    try {
      const authHeader = req.get("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) {
        res.status(401).json({error: "no_auth"});
        return;
      }

      let uid;
      try {
        uid = (await admin.auth().verifyIdToken(token)).uid;
      } catch (e) {
        res.status(401).json({error: "bad_token"});
        return;
      }

      const db = admin.firestore();
      const userDoc = await db.collection("users").doc(uid).get();
      const estPremium = PREMIUM_OUVERT ||
        (userDoc.exists && userDoc.data().premium === true);
      if (!estPremium) {
        res.status(403).json({error: "not_premium"});
        return;
      }

      // Blocage alimentation : le coach texte lit les repas, il est ferme comme
      // la voix et la photo. Sans effet tant que config/acces.blocage n'est pas
      // a true. La barre de la seance ne passe pas par ici (elle est locale).
      if (await accesNutrition.blocageActif(db) &&
          !accesNutrition.accesActif(userDoc.exists ? userDoc.data() : null)) {
        res.status(403).json({error: "acces_nutrition"});
        return;
      }

      const {message, contexte} = req.body || {};
      const dit = String(message || "").trim().slice(0, 500);
      if (!dit) {
        res.status(400).json({error: "no_message"});
        return;
      }

      const ctx = contexte && typeof contexte === "object" ? contexte : {};
      const prompt = `Tu es le coach BelFit. Ton job: comprendre ce que l'utilisateur vient de dire et proposer des aliments a ajouter au journal.

Message: ${JSON.stringify(dit)}
Langue: ${ctx.langue || "fr"}
Objectifs du jour: ${JSON.stringify(ctx.objectifs || {})}
Deja mange aujourd'hui: ${JSON.stringify(ctx.totaux || {})}
Repas disponibles: ${JSON.stringify(ctx.repas || [])}

Reponds UNIQUEMENT avec un JSON valide, sans texte autour:
{
  "texte": "phrase courte (1-2 phrases) en ${ctx.langue || "fr"}, tutoiement, sans jargon. Si tu ajoutes des aliments, dis les kcal approx et ce qu'il resterait.",
  "aliments": [
    {"aliment":"nom simple","quantite":nombre,"unite":"g"|"ml"|"piece","repasCle":"pdej"|"dej"|"diner"|"snack"}
  ],
  "eauLitres": 0
}

Regles:
- Si le message decrit un repas, remplis aliments. Convertis en g/ml si possible (un oeuf=60g, une banane=120g, une biere=330ml).
- Un durum / durüm / doner kebab = Pain blanc 120g + Viande de kebab 150g. PAS du pain seul. Les frites s'ajoutent si elles sont dites (portion 200g).
- Eau : verre=0.25 L, bouteille=0.5 L, 50 cl=0.5. Remplis eauLitres, n'invente pas un aliment Eau.
- repasCle: petit-dejeuner=pdej, midi=dej, soir=diner, snack/collation=snack. Si l'heure n'est pas dite, choisis le premier repas encore peu rempli, sinon diner.
- Noms d'aliments simples (poulet, riz cuit, frites, pain, fromage, Viande de kebab).
- Si ce n'est pas un repas (question, salutation), aliments=[] et reponds brievement en renvoyant vers le journal.
- N'invente pas d'aliments absents du message.
- Maximum 8 aliments.`;

      const out = await geminiJson(GEMINI_API_KEY.value(), prompt);
      const aliments = Array.isArray(out.aliments) ? out.aliments.slice(0, 8).map((a) => ({
        aliment: String(a && a.aliment || "").slice(0, 80),
        quantite: Number(a && a.quantite) || 0,
        unite: ["g", "ml", "piece"].includes(a && a.unite) ? a.unite : "g",
        repasCle: ["pdej", "dej", "diner", "snack"].includes(a && a.repasCle) ?
          a.repasCle : "diner",
      })).filter((a) => a.aliment && a.quantite > 0) : [];

      const eauLitres = Math.max(0, Math.min(4, Number(out.eauLitres) || 0));

      res.status(200).json({
        texte: String(out.texte || "").slice(0, 280),
        aliments,
        eauLitres,
      });
    } catch (err) {
      console.error("coachAgent", err);
      if (err && err.message === "gemini_failed") {
        let detail = "";
        try {
          detail = (JSON.parse(err.detail).error || {}).message || "";
        } catch (e) {
          detail = String(err.detail || "");
        }
        res.status(502).json({error: "gemini_failed", detail: detail.slice(0, 160)});
        return;
      }
      res.status(500).json({error: "server"});
    }
  },
);
