import { langue } from './index.js';

// ============================================================
// ECRANS CONNECTES — anglais et neerlandais (20/11, 2e passe).
// Suivi coach, plan en preparation, cadran sans plan, repas par
// defaut, Mes seances, Choisir mes exercices, seance guidee.
// tx('texte francais', { var }) : la cle EST le francais, une chaine
// absente reste en francais. Variables : {n}, {d}, {nom}…
// Format : 'francais': ['anglais', 'neerlandais'].
// ============================================================

const X = {
  // ---- app Android : message neutre (services/app-android.js)
  "Ton plan apparaîtra ici dès que ton coach l'aura préparé.": ['Your plan will appear here as soon as your coach has prepared it.', 'Je plan verschijnt hier zodra je coach het heeft opgesteld.'],
  ' Tes anciens repas restent consultables ci-dessous.': [' Your previous meals can still be viewed below.', ' Je vorige maaltijden blijven hieronder raadpleegbaar.'],
  'ALIMENTATION': ['NUTRITION', 'VOEDING'], 'Alimentation': ['Nutrition', 'Voeding'],
  'Accès terminé le {d}': ['Access ended on {d}', 'Toegang beëindigd op {d}'], 'Accès terminé': ['Access ended', 'Toegang beëindigd'],
  'Tes anciens repas restent consultables': ['Your previous meals can still be viewed', 'Je vorige maaltijden blijven raadpleegbaar'],
  'Entraînement offert': ['Training included free', 'Training gratis inbegrepen'],
  'Tu remplis un questionnaire personnalisé': ['You fill in a personalised questionnaire', 'Je vult een persoonlijke vragenlijst in'],
  'Ton plan repas sur mesure, livré sous 48 h': ['Your tailor-made meal plan, delivered within 48 h', 'Je maaltijdplan op maat, geleverd binnen 48 u'],
  'Reprendre mon programme': ['Resume my programme', 'Mijn programma hervatten'], 'Débloquer mon programme': ['Unlock my programme', 'Mijn programma ontgrendelen'],

  // ---- cadran sans plan (store/cadran-attente.js)
  'Plan en préparation': ['Plan in preparation', 'Plan in voorbereiding'], 'Aucun plan actif': ['No active plan', 'Geen actief plan'],
  'Plan reçu · commence bientôt': ['Plan received · starts soon', 'Plan ontvangen · start binnenkort'],
  'Plan reçu · commence aujourd’hui': ['Plan received · starts today', 'Plan ontvangen · start vandaag'],
  'Plan reçu · commence demain': ['Plan received · starts tomorrow', 'Plan ontvangen · start morgen'],
  'Plan reçu · commence le {d}': ['Plan received · starts on {d}', 'Plan ontvangen · start op {d}'],
  'Journal du {d}': ['Log for {d}', 'Logboek van {d}'],

  // ---- repas par defaut (store/journal.js : le nom stocke reste francais)
  'Petit déjeuner': ['Breakfast', 'Ontbijt'], 'Petit-déjeuner': ['Breakfast', 'Ontbijt'], 'Déjeuner': ['Lunch', 'Middagmaal'],
  'Dîner': ['Dinner', 'Avondmaal'], 'Collations': ['Snacks', 'Tussendoortjes'], 'Collation': ['Snack', 'Tussendoortje'],
  "Collation de l'après-midi": ['Afternoon snack', 'Namiddagsnack'], 'Collation du matin': ['Morning snack', 'Ochtendsnack'],
  'Collation du soir': ['Evening snack', 'Avondsnack'], 'Souper': ['Dinner', 'Avondmaal'], 'Dîner (midi)': ['Lunch', 'Middagmaal'],

  // ---- PlanEnPreparation
  'Réponses': ['Answers', 'Antwoorden'], 'Mes réponses': ['My answers', 'Mijn antwoorden'], 'Fermer': ['Close', 'Sluiten'],
  'Copié': ['Copied', 'Gekopieerd'], 'Copier': ['Copy', 'Kopiëren'], 'En attente de ton virement': ['Waiting for your bank transfer', 'In afwachting van je overschrijving'],
  'Montant': ['Amount', 'Bedrag'], 'IBAN': ['IBAN', 'IBAN'], 'Bénéficiaire': ['Beneficiary', 'Begunstigde'], 'Communication': ['Reference', 'Mededeling'],
  "Ton plan est préparé dès réception du virement. Mets bien la communication, c'est elle qui relie le paiement à ton dossier.":
    ['Your plan is prepared as soon as the transfer arrives. Make sure to include the reference: it links the payment to your file.',
      'Je plan wordt opgesteld zodra de overschrijving binnen is. Vermeld zeker de mededeling: die koppelt de betaling aan je dossier.'],
  'TON COACH': ['YOUR COACH', 'JE COACH'], 'Ton plan arrive': ['Your plan is on its way', 'Je plan komt eraan'],
  "Questionnaire bien reçu. Je m'occupe de toi.": ["Questionnaire received. I'm taking care of you.", 'Vragenlijst goed ontvangen. Ik ga voor je aan de slag.'],
  'Ta demande est dans la file': ['Your request is in the queue', 'Je aanvraag staat in de wachtrij'],
  "Dans l'app et par e-mail": ['In the app and by e-mail', 'In de app en via e-mail'], 'Livraison au plus tard': ['Delivery at the latest', 'Uiterlijk geleverd'],
  'Reçu {d}': ['Received {d}', 'Ontvangen {d}'], '≈ {n} h restantes': ['≈ {n} h left', '≈ {n} u resterend'], 'Livraison imminente': ['Delivery imminent', 'Levering op komst'],
  'Activation en attente': ['Activation pending', 'Activering in afwachting'], 'Virement en attente': ['Transfer pending', 'Overschrijving in afwachting'],
  '{m} € · communication {c}': ['{m} € · reference {c}', '{m} € · mededeling {c}'],
  'Plan offert': ['Plan offered', 'Plan aangeboden'], 'Programme activé': ['Programme activated', 'Programma geactiveerd'], 'Paiement reçu': ['Payment received', 'Betaling ontvangen'],
  'Questionnaire envoyé': ['Questionnaire sent', 'Vragenlijst verstuurd'], "Programme en cours d'élaboration": ['Programme being prepared', 'Programma wordt opgesteld'],
  "Dès l'activation": ['From activation', 'Vanaf de activering'], 'Dès réception du virement': ['As soon as the transfer arrives', 'Zodra de overschrijving binnen is'],
  'En cours': ['In progress', 'Bezig'], 'Plan livré': ['Plan delivered', 'Plan geleverd'], 'EN ATTENDANT': ['IN THE MEANTIME', 'IN AFWACHTING'],
  'Note tes repas dans le journal': ['Log your meals in the journal', 'Noteer je maaltijden in het logboek'],
  'Pèse-toi demain matin, à jeun': ['Weigh yourself tomorrow morning, before eating', 'Weeg je morgenochtend nuchter'],
  'Revoir mes réponses': ['Review my answers', 'Mijn antwoorden bekijken'], 'Question sur mon plan': ['Question about my plan', 'Vraag over mijn plan'],
  'Une question ? Écrire à mon coach': ['A question? Write to my coach', 'Een vraag? Schrijf mijn coach'],

  // ---- SuiviClient
  'Plan livré le {d}': ['Plan delivered on {d}', 'Plan geleverd op {d}'], 'Ton plan arrive bientôt': ['Your plan is coming soon', 'Je plan komt binnenkort'],
  'Ajustements inclus ce mois-ci.': ['Adjustments included this month.', 'Bijsturingen deze maand inbegrepen.'], 'MON MOIS': ['MY MONTH', 'MIJN MAAND'],
  'jour restant': ['day left', 'dag resterend'], 'jours restants': ['days left', 'dagen resterend'], 'Mois en cours': ['Current month', 'Lopende maand'],
  'Terminé': ['Finished', 'Afgelopen'], 'Du {a} au {b} · Ajustements inclus ce mois-ci': ['From {a} to {b} · Adjustments included this month', 'Van {a} tot {b} · Bijsturingen deze maand inbegrepen'],
  "MON PLAN AUJOURD'HUI": ['MY PLAN TODAY', 'MIJN PLAN VANDAAG'], '{n} notées': ['{n} logged', '{n} genoteerd'],
  'protéines': ['protein', 'eiwitten'], 'glucides': ['carbs', 'koolhydraten'], 'lipides': ['fat', 'vetten'], ' · prochain': [' · next', ' · volgende'],
  'Noté': ['Logged', 'Genoteerd'], 'Ajouter au journal': ['Add to journal', 'Toevoegen aan logboek'], 'Voir tout mon plan': ['See my whole plan', 'Mijn volledige plan bekijken'],
  'MES PROGRÈS': ['MY PROGRESS', 'MIJN VOORUITGANG'], 'depuis le début du plan': ['since the start of the plan', 'sinds het begin van het plan'],
  'dernière pesée le {d}': ['last weigh-in on {d}', 'laatste weging op {d}'],
  "Pèse-toi dans l'onglet Aujourd'hui pour suivre tes progrès ici.": ['Weigh yourself in the Today tab to track your progress here.', 'Weeg je in het tabblad Vandaag om je vooruitgang hier te volgen.'],
  'PROCHAINE ÉTAPE': ['NEXT STEP', 'VOLGENDE STAP'], 'Ton mois de coaching': ['Your coaching month', 'Je coachingmaand'],
  'Ton mois de coaching est terminé.': ['Your coaching month is over.', 'Je coachingmaand is afgelopen.'],
  "Ton plan et tes ajustements continuent jusqu'à la fin du mois.": ['Your plan and adjustments continue until the end of the month.', 'Je plan en je bijsturingen lopen door tot het einde van de maand.'],
  "Accès nutrition jusqu'au {d}.": ['Nutrition access until {d}.', 'Toegang tot voeding tot {d}.'],
  'Envie de continuer ? Le mois suivant (80 €) sera bientôt disponible.': ['Want to continue? The next month (80 €) will be available soon.', 'Wil je verder? De volgende maand (80 €) is binnenkort beschikbaar.'],
  'Un nouveau mois de coaching': ['A new coaching month', 'Een nieuwe coachingmaand'],
  "On repart d'un bilan complet, ajustements inclus pendant le mois.": ['We start again from a full review, adjustments included during the month.', 'We vertrekken opnieuw van een volledige evaluatie, bijsturingen inbegrepen tijdens de maand.'],
  "Ton plan reste consultable dans l'app.": ['Your plan remains available in the app.', 'Je plan blijft raadpleegbaar in de app.'],
  'Accès nutrition terminé le {d}.': ['Nutrition access ended on {d}.', 'Toegang tot voeding beëindigd op {d}.'],
  'Bientôt disponible': ['Available soon', 'Binnenkort beschikbaar'],
  "Ton plan est en préparation, livré dans l'app sous 48 h.": ['Your plan is being prepared and will be delivered in the app within 48 h.', 'Je plan wordt opgesteld en binnen 48 u in de app geleverd.'],

  // ---- S'entrainer : Mes seances
  'Mes séances': ['My workouts', 'Mijn trainingen'], '+ Créer': ['+ Create', '+ Maken'], '+ Créer une séance': ['+ Create a workout', '+ Training maken'],
  'Choisis tes exercices une fois, donne-lui un nom, relance-la en un toucher.': ['Choose your exercises once, give it a name, restart it with one tap.', 'Kies je oefeningen één keer, geef ze een naam en start ze opnieuw met één tik.'],
  '{n} exercice': ['{n} exercise', '{n} oefening'], '{n} exercices': ['{n} exercises', '{n} oefeningen'],
  'Modifier': ['Edit', 'Wijzigen'], 'Modifier {nom}': ['Edit {nom}', '{nom} wijzigen'], 'Commencer {nom}': ['Start {nom}', '{nom} starten'],
  'Partager ma séance': ['Share my workout', 'Mijn training delen'], 'Carte de ta séance': ['Your workout card', 'Kaart van je training'], 'Partager': ['Share', 'Delen'],
  'Ma séance': ['My workout', 'Mijn training'], 'Ma séance BelFit': ['My BelFit workout', 'Mijn BelFit-training'],
  'minutes': ['minutes', 'minuten'], 'exercice': ['exercise', 'oefening'], 'exercices': ['exercises', 'oefeningen'], 'séries': ['sets', 'sets'], 'série': ['set', 'set'],

  // ---- Choisir mes exercices
  'Barre': ['Barbell', 'Halterstang'], 'Haltères': ['Dumbbells', 'Dumbbells'], 'Machine / poulie': ['Machine / cable', 'Machine / kabel'],
  'Poulie': ['Cable', 'Kabel'], 'Poids du corps': ['Bodyweight', 'Lichaamsgewicht'], 'Kettlebell': ['Kettlebell', 'Kettlebell'], 'Élastique': ['Resistance band', 'Weerstandsband'],
  'Machine': ['Machine', 'Machine'], 'En salle': ['At the gym', 'In de fitness'], 'À domicile': ['At home', 'Thuis'],
  'Débutant': ['Beginner', 'Beginner'], 'Intermédiaire': ['Intermediate', 'Gevorderd'], 'Avancé': ['Advanced', 'Expert'], 'Libre': ['Free', 'Vrij'],
  'Modifier ma séance': ['Edit my workout', 'Mijn training wijzigen'], 'Créer une séance': ['Create a workout', 'Training maken'],
  'Choisir mes exercices': ['Choose my exercises', 'Mijn oefeningen kiezen'], 'Chercher un exercice': ['Search for an exercise', 'Een oefening zoeken'],
  'Effacer': ['Clear', 'Wissen'], 'Modifier les filtres': ['Change filters', 'Filters wijzigen'],
  '{n} sélectionné': ['{n} selected', '{n} geselecteerd'], '{n} sélectionnés': ['{n} selected', '{n} geselecteerd'],
  '{n} exercice trouvé': ['{n} exercise found', '{n} oefening gevonden'], '{n} exercices trouvés': ['{n} exercises found', '{n} oefeningen gevonden'],
  'Aucun exercice ne correspond.': ['No exercise matches.', 'Geen enkele oefening komt overeen.'],
  'Rien pour {m} avec ce matériel.': ['Nothing for {m} with this equipment.', 'Niets voor {m} met dit materiaal.'],
  'Aucun exercice pour ce matériel.': ['No exercise for this equipment.', 'Geen oefening voor dit materiaal.'],
  'Voir {nom}': ['View {nom}', '{nom} bekijken'], 'Ajouter': ['Add', 'Toevoegen'], '{n} exercices sélectionnés': ['{n} exercises selected', '{n} oefeningen geselecteerd'],
  'Ma séance →': ['My workout →', 'Mijn training →'], 'Enregistrer →': ['Save →', 'Opslaan →'], 'Supprimer cette séance': ['Delete this workout', 'Deze training verwijderen'],
  'Nom de la séance': ['Workout name', 'Naam van de training'],
  "Tu la retrouves dans « Mes séances », sur S'entraîner.": ['You will find it in “My workouts”, on Train.', 'Je vindt ze terug in „Mijn trainingen”, bij Trainen.'],
  'Enregistrer': ['Save', 'Opslaan'], 'Supprimer la séance': ['Delete the workout', 'De training verwijderen'], 'Supprimer « {nom} » ?': ['Delete “{nom}”?', '„{nom}” verwijderen?'],
  'Les séances déjà faites restent dans ton historique.': ['Workouts already done stay in your history.', 'Al gedane trainingen blijven in je geschiedenis.'],
  'Supprimer': ['Delete', 'Verwijderen'], 'Annuler': ['Cancel', 'Annuleren'], 'Filtres': ['Filters', 'Filters'],
  "Où t'entraînes-tu ?": ['Where do you train?', 'Waar train je?'], 'Matériel à la maison': ['Equipment at home', 'Materiaal thuis'],
  'Ton niveau': ['Your level', 'Je niveau'], 'Niveau de pratique': ['Training level', 'Trainingsniveau'],
  'Le niveau règle les séries de chaque exercice. Tout est retenu pour la prochaine fois.': ['The level sets the sets of each exercise. Everything is remembered for next time.', 'Het niveau bepaalt de sets van elke oefening. Alles wordt onthouden voor de volgende keer.'],
  'Voir les exercices': ['See the exercises', 'Oefeningen bekijken'],
  'Compose tes séries comme tu veux : ajoute, enlève, choisis tes charges.': ['Build your sets the way you want: add, remove, choose your loads.', 'Stel je sets samen zoals je wil: toevoegen, weghalen, gewichten kiezen.'],
  'Retirer de ma séance': ['Remove from my workout', 'Uit mijn training halen'], 'Ajouter à ma séance': ['Add to my workout', 'Aan mijn training toevoegen'],
  'échauffement': ['warm-up', 'opwarming'], 'montée': ['build-up', 'opbouw'], "jusqu'à l'échec": ['to failure', 'tot falen'],
  "jusqu'à l'échec, puis dégressive à 50 % sans repos": ['to failure, then drop set at 50% with no rest', 'tot falen, dan dropset op 50 % zonder rust'],

  // ---- seance guidee
  'Séance': ['Workout', 'Training'], 'Aucun exercice': ['No exercises', 'Geen oefeningen'],
  "Cette séance n'a pas d'exercices enregistrés.": ['This workout has no saved exercises.', 'Deze training heeft geen opgeslagen oefeningen.'], 'Retour': ['Back', 'Terug'], 'Réglages': ['Settings', 'Instellingen'],
  'Exercice {i} sur {n}': ['Exercise {i} of {n}', 'Oefening {i} van {n}'],
  'Remplacer par un exercice équivalent': ['Replace with an equivalent exercise', 'Vervangen door een gelijkwaardige oefening'], 'Alternative': ['Alternative', 'Alternatief'],
  'Calculer les disques à mettre': ['Work out the plates to load', 'Schijven berekenen'], 'Disques': ['Plates', 'Schijven'],
  'CORRECTION · ': ['CORRECTION · ', 'CORRECTIE · '], 'SÉRIE {i} SUR {n}': ['SET {i} OF {n}', 'SET {i} VAN {n}'],
  'Charge': ['Load', 'Gewicht'], '2,5 kg de moins': ['2.5 kg less', '2,5 kg minder'], '2,5 kg de plus': ['2.5 kg more', '2,5 kg meer'],
  'Charge en kg': ['Load in kg', 'Gewicht in kg'], 'Répétitions': ['Reps', 'Herhalingen'], 'reps': ['reps', 'herh.'],
  'Une répétition de moins': ['One rep less', 'Eén herhaling minder'], 'Une répétition de plus': ['One rep more', 'Eén herhaling meer'],
  'Une série de moins': ['One set less', 'Eén set minder'], '− Série': ['− Set', '− Set'], 'Corriger la série {n}': ['Correct set {n}', 'Set {n} corrigeren'],
  'Une série de plus': ['One set more', 'Eén set meer'], '+ Série': ['+ Set', '+ Set'], 'REPOS': ['REST', 'RUST'], 'Arrêter': ['Stop', 'Stoppen'],
  'Reprendre ma série ›': ['Back to my set ›', 'Terug naar mijn set ›'], 'Terminer ›': ['Finish ›', 'Afronden ›'], 'Suivant ›': ['Next ›', 'Volgende ›'],
  '+ Exercice': ['+ Exercise', '+ Oefening'], "Passer l'exercice": ['Skip the exercise', 'Oefening overslaan'], 'Passer': ['Skip', 'Overslaan'],
  'Terminer la séance': ['Finish the workout', 'Training afronden'], 'Terminer': ['Finish', 'Afronden'], "Remplacer l'exercice": ['Replace the exercise', 'Oefening vervangen'],
  'Même muscle, même mouvement, avec un autre matériel. Choisis ce que tu as sous la main.': ['Same muscle, same movement, with other equipment. Pick what you have at hand.', 'Zelfde spier, zelfde beweging, met ander materiaal. Kies wat je bij de hand hebt.'],
  'Disques par côté': ['Plates per side', 'Schijven per kant'], 'Poids de la barre': ['Bar weight', 'Gewicht van de stang'], 'Barre {n} kg': ['{n} kg bar', 'Stang {n} kg'],
  'La barre seule pèse {n} kg.': ['The bar alone weighs {n} kg.', 'De stang alleen weegt {n} kg.'], 'La barre seule, sans disque.': ['The bar alone, no plates.', 'Enkel de stang, zonder schijven.'],
  ' de chaque côté.': [' on each side.', ' aan elke kant.'],
  'Il manque {n} kg pour tomber juste avec ces disques.': ['{n} kg short of an exact match with these plates.', 'Er ontbreekt {n} kg om precies uit te komen met deze schijven.'],
};

const norme = (x) => x.replace(/[  ]/g, ' ');
const INDEX = Object.fromEntries(Object.entries(X).map(([k, v]) => [norme(k), v]));

/** Texte d'ecran dans la langue de l'app ; variables {k}. */
export function tx(s, vars) {
  if (typeof s !== 'string') return s;
  const l = langue.value;
  let r = s;
  if (l === 'en' || l === 'nl') { const e = INDEX[norme(s)]; if (e) r = e[l === 'en' ? 0 : 1]; }
  if (vars) for (const k in vars) r = r.split('{' + k + '}').join(vars[k]);
  return r;
}

/** Locale des dates et des nombres selon la langue de l'app. */
export function locale() {
  const l = langue.value;
  return l === 'en' ? 'en-GB' : l === 'nl' ? 'nl-BE' : 'fr-BE';
}
