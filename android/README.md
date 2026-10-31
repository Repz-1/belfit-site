# BELFIT — Publication Google Play (TWA)

> **Mise à jour 31/10/2026 (v643)** — configuration retenue pour la première publication :
> hôte `www.belfit.be`, `startUrl` `/v2/?source=twa`, **Play Billing désactivé** (option A :
> aucun achat dans l'app Android, le paiement Mollie reste sur le web ; l'app masque prix et
> boutons d'achat en mode TWA, voir `app-v2/src/services/app-android.js`), clé d'upload
> alias `upload` (empreinte SHA-256 dans `.well-known/assetlinks.json`). L'empreinte de la clé
> Play App Signing sera ajoutée à `assetlinks.json` après création de l'app dans la Play Console.
> La section 6 (Play Billing) ne s'applique pas à cette version.


Procédure à exécuter **sur ta machine**, pas depuis Claude : la construction
d'un APK nécessite le SDK Android, qui n'est pas accessible depuis
l'environnement de développement distant.

---

## 0. Prérequis

- **Java JDK 17 ou plus** — `java -version` pour vérifier
- **Node.js 18 ou plus**
- Un compte Play Console **Organisation** vérifié

```bash
npm install -g @bubblewrap/cli
```

Au premier lancement, Bubblewrap propose de télécharger le SDK Android
automatiquement : accepte.

---

## 1. Générer la clé de signature — ÉTAPE IRRÉVERSIBLE

Cette clé prouve à Google que les mises à jour viennent bien de toi.
**Si tu la perds, tu ne peux plus jamais mettre à jour l'application.**
Il faudrait republier sous un autre nom et tes utilisateurs seraient perdus.

```bash
cd android
keytool -genkeypair \
  -alias belfit \
  -keystore android-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000
```

Il te sera demandé un mot de passe, ton nom et celui de l'entreprise.

**Sauvegarde immédiatement, en trois endroits distincts :**

- le fichier `android-keystore.jks`
- le mot de passe du keystore
- le mot de passe de l'alias

Un gestionnaire de mots de passe, un disque externe, et un cloud privé.
Ce fichier ne doit **jamais** être poussé sur GitHub — il est déjà
dans le `.gitignore`.

---

## 2. Récupérer l'empreinte de la clé

```bash
keytool -list -v -keystore android-keystore.jks -alias belfit | grep SHA256
```

Copie la valeur affichée (format `AB:CD:EF:...`).

---

## 3. Compléter le fichier de liaison

Ouvre `.well-known/assetlinks.json` à la racine du dépôt et remplace
`A_REMPLACER_PAR_EMPREINTE_CLE_UPLOAD` par l'empreinte obtenue.

Ce fichier prouve à Android que `belfit.be` et l'application appartiennent
au même propriétaire. **Sans lui, l'app s'ouvrira avec une barre d'adresse
visible en haut** — l'effet « site web emballé » qui fait mauvaise impression
et peut motiver un rejet.

La seconde empreinte (`CLE_PLAY`) se récupère après le premier envoi, dans
Play Console → Configuration → Intégrité de l'application. Ajoute-la ensuite
et redéploie le site.

Vérification une fois le site déployé :
https://belfit.be/.well-known/assetlinks.json doit être accessible
et servi en `application/json`.

---

## 4. Construire l'application

```bash
cd android
bubblewrap init --manifest https://belfit.be/manifest.json
# accepte le twa-manifest.json existant si proposé
bubblewrap build
```

Résultat : `app-release-bundle.aab` — c'est ce fichier qu'on envoie à Google.

---

## 5. Envoyer sur Play Console

1. Créer l'application (nom : BELFIT, langue : français, type : Application, gratuite)
2. Téléverser `app-release-bundle.aab` sur le canal de test interne d'abord
3. Remplir la fiche : description, icône 512×512, image mise en avant 1024×500,
   captures d'écran du téléphone (minimum 2)
4. Remplir le formulaire **Sécurité des données** — il doit correspondre
   exactement à ta politique de confidentialité (Firebase = collecte d'email
   et de données de santé, à déclarer)
5. Questionnaire de classification du contenu
6. Passage en production

---

## 6. Abonnements Play Billing

À faire une fois l'app acceptée en test interne :

1. Play Console → Produits → Abonnements → créer `belfit_premium_mensuel`
   et `belfit_premium_annuel`
2. Côté web, brancher les API Digital Goods et Payment Request
3. Côté serveur, une Cloud Function vérifie l'achat auprès de Google
   puis écrit `premium: true` et `source: 'google'` dans
   `users/{uid}` — le même champ que LemonSqueezy, pour qu'un abonné
   Android soit également Premium sur le web et sur iPhone

---

## Points de vigilance

- **Ne jamais perdre le keystore.** C'est l'erreur irrattrapable.
- L'identifiant `be.belfit.app` est définitif : impossible à changer après publication.
- Les nouvelles applications doivent viser Android 16 avant le 31 août 2026.
- Le fichier `assetlinks.json` doit rester en ligne en permanence.
