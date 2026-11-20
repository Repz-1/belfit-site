import { langue } from './index.js';

// ============================================================
// QUESTIONNAIRE COACH — affichage en anglais et en neerlandais (20/11).
// Les VALEURS enregistrees restent en francais (data/questionnaire-coach.js,
// lisibles telles quelles par le coach et par son IA) ; seul l'AFFICHAGE
// est traduit, par tq(texte francais). Une chaine absente d'ici reste en
// francais. Format : 'francais': ['anglais', 'neerlandais'].
// ============================================================

const Q = {
  // ---- aliments par categorie
  'Protéines': ['Proteins', 'Eiwitten'], 'Blanc de poulet': ['Chicken breast', 'Kipfilet'], 'Dinde': ['Turkey', 'Kalkoen'],
  'Bœuf haché 5%': ['Lean minced beef 5%', 'Rundergehakt 5%'], 'Steak de bœuf': ['Beef steak', 'Rundersteak'],
  'Saumon': ['Salmon', 'Zalm'], 'Thon': ['Tuna', 'Tonijn'], 'Cabillaud': ['Cod', 'Kabeljauw'], 'Crevettes': ['Prawns', 'Garnalen'],
  'Œufs': ['Eggs', 'Eieren'], 'Jambon de dinde': ['Turkey ham', 'Kalkoenham'], 'Jambon': ['Ham', 'Ham'], 'Tofu': ['Tofu', 'Tofu'],
  'Lentilles': ['Lentils', 'Linzen'], 'Pois chiches': ['Chickpeas', 'Kikkererwten'], 'Whey': ['Whey', 'Whey'],
  'Féculents': ['Starches', 'Zetmeelproducten'], 'Riz': ['Rice', 'Rijst'], 'Riz complet': ['Brown rice', 'Volkorenrijst'],
  'Pâtes': ['Pasta', 'Pasta'], 'Pâtes complètes': ['Wholewheat pasta', 'Volkorenpasta'], 'Pomme de terre': ['Potato', 'Aardappel'],
  'Patate douce': ['Sweet potato', 'Zoete aardappel'], 'Quinoa': ['Quinoa', 'Quinoa'], "Flocons d'avoine": ['Oat flakes', 'Havervlokken'],
  'Pain complet': ['Wholemeal bread', 'Volkorenbrood'], 'Pain blanc': ['White bread', 'Wit brood'], 'Wrap': ['Wrap', 'Wrap'],
  'Semoule': ['Couscous', 'Couscous'], 'Boulgour': ['Bulgur', 'Bulgur'],
  'Légumes': ['Vegetables', 'Groenten'], 'Brocoli': ['Broccoli', 'Broccoli'], 'Courgette': ['Courgette', 'Courgette'],
  'Haricots verts': ['Green beans', 'Sperziebonen'], 'Épinards': ['Spinach', 'Spinazie'], 'Poivron': ['Bell pepper', 'Paprika'],
  'Carotte': ['Carrot', 'Wortel'], 'Tomate': ['Tomato', 'Tomaat'], 'Champignons': ['Mushrooms', 'Champignons'],
  'Chou-fleur': ['Cauliflower', 'Bloemkool'], 'Salade': ['Lettuce', 'Sla'], 'Concombre': ['Cucumber', 'Komkommer'], 'Poireau': ['Leek', 'Prei'],
  'Fruits': ['Fruit', 'Fruit'], 'Banane': ['Banana', 'Banaan'], 'Pomme': ['Apple', 'Appel'], 'Fraises': ['Strawberries', 'Aardbeien'],
  'Myrtilles': ['Blueberries', 'Blauwe bessen'], 'Orange': ['Orange', 'Sinaasappel'], 'Kiwi': ['Kiwi', 'Kiwi'], 'Mangue': ['Mango', 'Mango'],
  'Ananas': ['Pineapple', 'Ananas'], 'Poire': ['Pear', 'Peer'], 'Raisin': ['Grapes', 'Druiven'],
  'Laitiers': ['Dairy', 'Zuivel'], 'Skyr': ['Skyr', 'Skyr'], 'Yaourt nature': ['Plain yoghurt', 'Natuuryoghurt'],
  'Fromage blanc': ['Fromage blanc (quark)', 'Platte kaas'], 'Lait demi-écrémé': ['Semi-skimmed milk', 'Halfvolle melk'],
  'Cottage cheese': ['Cottage cheese', 'Cottage cheese'], 'Mozzarella': ['Mozzarella', 'Mozzarella'], 'Emmental': ['Emmental', 'Emmentaler'],
  "Lait d'amande": ['Almond milk', 'Amandelmelk'],
  'Collations': ['Snacks', 'Tussendoortjes'], 'Amandes': ['Almonds', 'Amandelen'], 'Noix': ['Walnuts', 'Walnoten'],
  'Beurre de cacahuète': ['Peanut butter', 'Pindakaas'], 'Chocolat noir': ['Dark chocolate', 'Pure chocolade'],
  'Barre protéinée': ['Protein bar', 'Eiwitreep'], 'Galettes de riz': ['Rice cakes', 'Rijstwafels'], 'Fruits secs': ['Dried fruit', 'Gedroogd fruit'],
  'Compote': ['Fruit compote', 'Appelmoes'],

  // ---- consentements
  'Confidentialité': ['Privacy', 'Privacy'], 'CGV': ['Terms of sale', 'Verkoopvoorwaarden'], 'FAQ': ['FAQ', 'FAQ'],
  "J'accepte que mes informations, y compris de santé, soient utilisées par BELFIT et mon coach pour construire et m'envoyer mon plan.":
    ['I agree that my information, including health information, is used by BELFIT and my coach to build and send me my plan.',
      'Ik ga ermee akkoord dat mijn gegevens, ook over mijn gezondheid, door BELFIT en mijn coach gebruikt worden om mijn plan op te stellen en me te bezorgen.'],
  'Je comprends que ce n\'est pas un avis médical. Je dois signaler une pathologie, une grossesse ou un traitement.':
    ['I understand that this is not medical advice. I must report any medical condition, pregnancy or treatment.',
      'Ik begrijp dat dit geen medisch advies is. Ik moet een aandoening, zwangerschap of behandeling melden.'],
  'Je demande à recevoir mon plan tout de suite. Une fois livré, je perds mon droit de rétractation de 14 jours. Remboursement : voir FAQ.':
    ['I ask to receive my plan straight away. Once it is delivered, I lose my 14-day right of withdrawal. Refund: see FAQ.',
      'Ik vraag om mijn plan meteen te ontvangen. Zodra het geleverd is, verlies ik mijn herroepingsrecht van 14 dagen. Terugbetaling: zie FAQ.'],

  // ---- bilan du mois (ancien parcours, encore lisible)
  'Ton bilan du mois': ['Your monthly review', 'Je maandelijkse evaluatie'], 'Ton bilan': ['Your review', 'Je evaluatie'],
  'Quelques minutes pour ajuster ton plan.': ['A few minutes to adjust your plan.', 'Enkele minuten om je plan bij te sturen.'],
  "Ton poids aujourd'hui": ['Your weight today', 'Je gewicht vandaag'], 'Cette pesée est': ['This weigh-in is', 'Deze weging is'],
  "Mêmes conditions que d'habitude": ['Same conditions as usual', 'In dezelfde omstandigheden als anders'], 'Approximative': ['Approximate', 'Bij benadering'],
  'Observance réelle': ['How well you really followed it', 'Hoe goed je het echt volgde'], "J'ai suivi à peu près": ['I roughly followed', 'Ik volgde ongeveer'],
  'La moitié': ['Half', 'De helft'], 'Peu': ['Little', 'Weinig'],
  'Faim / énergie / digestion ce mois-ci': ['Hunger / energy / digestion this month', 'Honger / energie / spijsvertering deze maand'],
  'Mieux': ['Better', 'Beter'], 'Pareil': ['Same', 'Hetzelfde'], 'Pire': ['Worse', 'Slechter'],
  'La suite': ['What comes next', 'Het vervolg'], 'Ce qui marche, ce qui change.': ['What works, what changes.', 'Wat werkt, wat verandert.'],
  'Ce qui a bien marché ce mois-ci': ['What worked well this month', 'Wat deze maand goed werkte'],
  'Ce que tu veux changer': ['What you want to change', 'Wat je wil veranderen'], 'Plus de variété': ['More variety', 'Meer variatie'],
  'Moins de faim': ['Less hunger', 'Minder honger'], 'Nouvel objectif': ['New goal', 'Nieuw doel'], 'Horaires différents': ['Different schedule', 'Andere uren'],
  'Juste ajuster les quantités': ['Just adjust the quantities', 'Enkel de hoeveelheden bijsturen'],
  "L'entraînement a bougé ?": ['Has your training changed?', 'Is je training veranderd?'], 'Non': ['No', 'Nee'], 'Plus': ['More', 'Meer'],
  'Moins': ['Less', 'Minder'], 'Blessé': ['Injured', 'Geblesseerd'], 'Nouveau sport': ['New sport', 'Nieuwe sport'],
  'Nouveau traitement, grossesse, blessure ?': ['New treatment, pregnancy, injury?', 'Nieuwe behandeling, zwangerschap, blessure?'],
  'Oui': ['Yes', 'Ja'], 'Précise en une ligne': ['Explain in one line', 'Licht toe in één regel'],
  'Message pour le prochain plan': ['Message for the next plan', 'Bericht voor het volgende plan'],

  // ---- A. toi
  'Faisons connaissance': ["Let's get to know you", 'Kennismaking'], 'Toi': ['You', 'Jij'],
  'Pour personnaliser ton plan et nos échanges.': ['To personalise your plan and our exchanges.', 'Om je plan en onze contacten te personaliseren.'],
  'Prénom': ['First name', 'Voornaam'], 'Nom': ['Last name', 'Achternaam'], 'E-mail': ['E-mail', 'E-mail'], 'Téléphone': ['Phone', 'Telefoon'],
  'Âge': ['Age', 'Leeftijd'], 'ans': ['years', 'jaar'], 'Sexe': ['Sex', 'Geslacht'], 'Femme': ['Woman', 'Vrouw'], 'Homme': ['Man', 'Man'],
  'Comment tu nous as connus ?': ['How did you hear about us?', 'Hoe heb je ons leren kennen?'],
  'Instagram': ['Instagram', 'Instagram'], 'TikTok': ['TikTok', 'TikTok'], 'Un pote': ['A friend', 'Een vriend'], 'Google': ['Google', 'Google'],
  'Un influenceur': ['An influencer', 'Een influencer'], 'Autre': ['Other', 'Andere'],

  // ---- B. objectif
  "Qu'est-ce que tu veux obtenir ?": ['What do you want to achieve?', 'Wat wil je bereiken?'], 'Ton objectif': ['Your goal', 'Je doel'],
  'Un seul choix : ton plan sera construit autour.': ['One choice only: your plan will be built around it.', 'Eén keuze: je plan wordt erop gebouwd.'],
  'Ton objectif principal': ['Your main goal', 'Je hoofddoel'], 'Perdre du gras': ['Lose fat', 'Vet verliezen'],
  'Prendre du muscle': ['Build muscle', 'Spiermassa opbouwen'], 'Recomposition': ['Recomposition', 'Recompositie'],
  'Énergie et santé': ['Energy and health', 'Energie en gezondheid'], 'Le point le plus urgent': ['The most urgent point', 'Het dringendste punt'],
  'Digestion': ['Digestion', 'Spijsvertering'], 'Fatigue': ['Tiredness', 'Vermoeidheid'], 'Sommeil': ['Sleep', 'Slaap'],
  'Analyses (glycémie, cholestérol…)': ['Test results (blood sugar, cholesterol…)', 'Bloedwaarden (suiker, cholesterol…)'],
  'Tu as une échéance ?': ['Do you have a deadline?', 'Heb je een deadline?'], 'Pas de date': ['No date', 'Geen datum'],
  'Dans 3 mois': ['In 3 months', 'Binnen 3 maanden'], 'Date précise': ['Specific date', 'Precieze datum'], 'Quelle date ?': ['Which date?', 'Welke datum?'],
  'Il y a un événement derrière ? (mariage, été, compétition…)': ['Is there an event behind it? (wedding, summer, competition…)', 'Zit er een gebeurtenis achter? (huwelijk, zomer, wedstrijd…)'],
  'Poids que tu vises': ['Target weight', 'Streefgewicht'], "Motivation aujourd'hui": ['Motivation today', 'Motivatie vandaag'],
  'Je me force': ['I have to push myself', 'Ik moet me dwingen'], 'Prêt à changer': ['Ready to change', 'Klaar om te veranderen'],
  "Confiance d'y arriver": ['Confidence you will get there', 'Vertrouwen dat het lukt'], 'Pas du tout': ['Not at all', 'Helemaal niet'], 'Totale': ['Total', 'Volledig'],

  // ---- C. mesures
  'Tes mesures': ['Your measurements', 'Je metingen'], 'Pour calculer tes besoins au plus juste.': ['To calculate your needs as precisely as possible.', 'Om je behoeften zo juist mogelijk te berekenen.'],
  'Poids actuel (ce matin si possible)': ['Current weight (this morning if possible)', 'Huidig gewicht (vanochtend als het kan)'],
  'Taille': ['Height', 'Lengte'], 'cm': ['cm', 'cm'], 'kg': ['kg', 'kg'], 'Tour de taille (au nombril)': ['Waist (at the navel)', 'Taille-omtrek (ter hoogte van de navel)'],
  'Tour de hanches': ['Hips', 'Heupomtrek'],
  'À combien de pourcent estimes-tu ta masse grasse ? (facultatif, laisse vide si tu ne sais pas)': ['What do you estimate your body fat percentage to be? (optional, leave empty if you don\'t know)', 'Op hoeveel procent schat je je vetpercentage? (optioneel, laat leeg als je het niet weet)'],
  'Depuis combien de temps fais-tu de la musculation ?': ['How long have you been doing strength training?', 'Hoe lang doe je al aan krachttraining?'],
  'Jamais': ['Never', 'Nooit'], "Moins d'1 an": ['Less than 1 year', 'Minder dan 1 jaar'], '1 à 3 ans': ['1 to 3 years', '1 tot 3 jaar'], 'Plus de 3 ans': ['More than 3 years', 'Meer dan 3 jaar'],
  "Niveau d'activité au quotidien (hors sport)": ['Daily activity level (excluding sport)', 'Dagelijks activiteitsniveau (zonder sport)'],
  'Assis la plupart de la journée': ['Sitting most of the day', 'Het grootste deel van de dag zittend'],
  'Debout ou marche au travail': ['Standing or walking at work', 'Rechtstaand of wandelend op het werk'], 'Métier physique': ['Physical job', 'Fysiek beroep'],
  'Pas par jour': ['Steps per day', 'Stappen per dag'], 'Je ne sais pas': ["I don't know", 'Ik weet het niet'],

  // ---- D. rythme
  'Ton rythme et tes repas': ['Your rhythm and your meals', 'Je ritme en je maaltijden'], 'Ton rythme': ['Your rhythm', 'Je ritme'],
  'Pour caler les repas sur ta vraie journée.': ['To fit the meals to your real day.', 'Om de maaltijden op je echte dag af te stemmen.'],
  'Nombre de repas par jour que tu veux dans le plan (hors collations)': ['Number of meals per day you want in the plan (excluding snacks)', 'Aantal maaltijden per dag die je in het plan wil (zonder tussendoortjes)'],
  'Nombre de repas que tu fais vraiment aujourd’hui': ['Number of meals you actually eat today', 'Aantal maaltijden dat je vandaag echt eet'],
  'Ça change tout le temps': ['It changes all the time', 'Het verandert voortdurend'],
  'À quel rythme tu vis tes journées ?': ['What is the rhythm of your days?', 'Welk ritme hebben je dagen?'],
  'Journée classique': ['Regular day', 'Gewone dag'], 'Horaires décalés': ['Shifted hours', 'Verschoven uren'],
  'Travail de nuit ou 3×8': ['Night work or rotating shifts', 'Nachtwerk of ploegendienst'], 'Horaires variables': ['Variable hours', 'Wisselende uren'],
  'Heure de réveil habituelle': ['Usual wake-up time', 'Gewoonlijk uur van opstaan'], 'Heure de coucher habituelle': ['Usual bedtime', 'Gewoonlijk uur van slapengaan'],
  'Temps pour cuisiner un jour de semaine': ['Time to cook on a weekday', 'Tijd om te koken op een weekdag'],
  'Très peu (< 15 min)': ['Very little (< 15 min)', 'Heel weinig (< 15 min)'], 'Un peu (15–30)': ['A little (15–30)', 'Een beetje (15–30)'],
  "J'aime cuisiner (30 min et +)": ['I like cooking (30 min or more)', 'Ik kook graag (30 min of meer)'],
  'Tu es ok pour cuisiner en avance (batch) ?': ['Are you OK with cooking ahead (batch)?', 'Wil je op voorhand koken (batch)?'],
  'Déjà en place': ['Already doing it', 'Doe ik al'], 'OK pour apprendre': ['Happy to learn', 'Wil ik leren'],
  "Je n'aime pas réchauffer": ["I don't like reheating", 'Ik warm niet graag op'], 'Impossible': ['Not possible', 'Onmogelijk'],
  "Le batch cooking, c'est cuisiner en une fois plusieurs repas à l'avance (par exemple le dimanche), puis les garder au frigo ou au congélateur pour la semaine.":
    ['Batch cooking means cooking several meals ahead in one go (for example on Sunday), then keeping them in the fridge or freezer for the week.',
      'Batch cooking betekent dat je in één keer meerdere maaltijden op voorhand kookt (bijvoorbeeld op zondag) en ze in de koelkast of diepvriezer bewaart voor de week.'],
  'Niveau en cuisine': ['Cooking level', 'Kookniveau'], 'Je réchauffe': ['I reheat', 'Ik warm op'], 'Les bases': ['The basics', 'De basis'],
  "À l'aise": ['Comfortable', 'Vlot'], 'Passionné': ['Passionate', 'Gepassioneerd'],
  'Repas hors domicile par semaine (midi + soir + week-end)': ['Meals away from home per week (lunch + dinner + weekend)', 'Maaltijden buitenshuis per week (middag + avond + weekend)'],
  'Aucun': ['None', 'Geen'], '5 et plus': ['5 or more', '5 of meer'], 'Matériel dispo': ['Equipment available', 'Beschikbaar materiaal'],
  'Cuisine complète': ['Full kitchen', 'Volledige keuken'], 'Four': ['Oven', 'Oven'], 'Micro-ondes': ['Microwave', 'Microgolfoven'],
  'Mixeur': ['Blender', 'Blender'], 'Airfryer': ['Air fryer', 'Airfryer'], 'Cuiseur riz': ['Rice cooker', 'Rijstkoker'], 'Congélo': ['Freezer', 'Diepvriezer'],

  // ---- E. entrainement
  'Ton entraînement': ['Your training', 'Je training'], 'Ton plan suit ta dépense.': ['Your plan follows your energy use.', 'Je plan volgt je verbruik.'],
  'Séances par semaine': ['Sessions per week', 'Trainingen per week'], 'Type': ['Type', 'Type'], 'Musculation': ['Strength training', 'Krachttraining'],
  'Cardio': ['Cardio', 'Cardio'], 'Sport collectif': ['Team sport', 'Ploegsport'], 'Mixte': ['Mixed', 'Gemengd'],
  "Durée typique d'une séance": ['Typical session length', 'Gewone duur van een training'], 'Intensité ressentie': ['Perceived intensity', 'Ervaren intensiteit'],
  'Tranquille': ['Easy', 'Rustig'], 'À fond': ['All out', 'Voluit'], 'Créneaux habituels': ['Usual time slots', 'Gewone momenten'],
  'Matin': ['Morning', 'Ochtend'], 'Midi': ['Lunchtime', 'Middag'], 'Soir': ['Evening', 'Avond'], 'Ça change': ['It varies', 'Het wisselt'],

  // ---- F. alimentation
  'Ce que tu manges': ['What you eat', 'Wat je eet'], 'Pour un plan que tu suivras vraiment.': ['For a plan you will really follow.', 'Voor een plan dat je echt zal volgen.'],
  'Régime actuel': ['Current diet', 'Huidig eetpatroon'], 'Tout': ['Everything', 'Alles'], 'Sans porc': ['No pork', 'Zonder varkensvlees'],
  'Halal': ['Halal', 'Halal'], 'Casher': ['Kosher', 'Koosjer'], 'Flexitarien': ['Flexitarian', 'Flexitariër'], 'Végétarien': ['Vegetarian', 'Vegetariër'],
  'Végan': ['Vegan', 'Veganist'], 'Aliments que tu refuses': ['Foods you refuse', 'Voedingsmiddelen die je weigert'],
  'Goût, éthique, texture…': ['Taste, ethics, texture…', 'Smaak, ethiek, textuur…'],
  'As-tu une allergie ou une intolérance alimentaire ?': ['Do you have a food allergy or intolerance?', 'Heb je een voedselallergie of -intolerantie?'],
  'Non, aucune': ['No, none', 'Nee, geen'], 'Lesquelles ?': ['Which ones?', 'Welke?'], 'Arachide': ['Peanut', 'Pinda'],
  'Fruits à coque': ['Tree nuts', 'Noten'], 'Lait / lactose': ['Milk / lactose', 'Melk / lactose'], 'Œuf': ['Egg', 'Ei'], 'Poisson': ['Fish', 'Vis'],
  'Crustacés / mollusques': ['Shellfish / molluscs', 'Schaaldieren / weekdieren'], 'Gluten / blé': ['Gluten / wheat', 'Gluten / tarwe'],
  'Sésame': ['Sesame', 'Sesam'], 'Soja': ['Soy', 'Soja'], 'Sulfites': ['Sulphites', 'Sulfieten'],
  'Quand tu en manges, que se passe-t-il ?': ['When you eat it, what happens?', 'Wat gebeurt er als je het eet?'],
  'Gêne digestive': ['Digestive discomfort', 'Darmklachten'], 'Peau (plaques, démangeaisons)': ['Skin (rash, itching)', 'Huid (vlekken, jeuk)'],
  'Gonflement lèvres / langue / gorge': ['Swelling of lips / tongue / throat', 'Zwelling van lippen / tong / keel'], 'Malaises': ['Feeling faint', 'Onwel worden'],
  "Je ne sais pas exactement, j'évite par précaution": ["I don't know exactly, I avoid it as a precaution", 'Ik weet het niet precies, ik vermijd het uit voorzorg'],
  'Précise en une ligne si besoin': ['Explain in one line if needed', 'Licht toe in één regel indien nodig'],
  'lactose ok en yaourt, pas en lait': ['lactose OK in yoghurt, not in milk', 'lactose ok in yoghurt, niet in melk'],
  'Aliments plaisir non négociables': ['Non-negotiable treats', 'Onmisbare genietmomenten'],
  'Pain, fromage, chocolat, pizza du vendredi…': ['Bread, cheese, chocolate, Friday pizza…', 'Brood, kaas, chocolade, pizza op vrijdag…'],
  'Ce qui change le week-end': ['What changes at the weekend', 'Wat er verandert in het weekend'],
  'Brunch, apéro, famille, alcool, grasse mat…': ['Brunch, drinks, family, alcohol, lie-ins…', 'Brunch, aperitief, familie, alcohol, uitslapen…'],
  'Pain / viennoiseries par semaine': ['Bread / pastries per week', 'Brood / koffiekoeken per week'], '2–3 fois': ['2–3 times', '2–3 keer'],
  'Tous les jours': ['Every day', 'Elke dag'], 'Plusieurs fois par jour': ['Several times a day', 'Meerdere keren per dag'],
  'Fast-food par semaine': ['Fast food per week', 'Fastfood per week'], 'Sucreries / chocolat': ['Sweets / chocolate', 'Snoep / chocolade'],
  'Rare': ['Rarely', 'Zelden'], 'Quelques fois': ['A few times', 'Enkele keren'],
  'Tes aliments': ['Your foods', 'Je voedingsmiddelen'], 'Coche ce que tu aimes et manges facilement.': ['Tick what you like and eat easily.', 'Vink aan wat je lekker vindt en makkelijk eet.'],
  'Tes aliments préférés (au moins 3 par catégorie principale)': ['Your favourite foods (at least 3 per main category)', 'Je favoriete voedingsmiddelen (minstens 3 per hoofdcategorie)'],

  // ---- G. boissons
  'Tes boissons': ['Your drinks', 'Je dranken'], 'Les calories qui passent souvent inaperçues.': ['The calories that often go unnoticed.', 'De calorieën die vaak onopgemerkt blijven.'],
  'Café par jour': ['Coffee per day', 'Koffie per dag'], 'tasses': ['cups', 'kopjes'], 'Est-ce que tu bois des sodas ?': ['Do you drink soft drinks?', 'Drink je frisdrank?'],
  'Plutôt light ou plutôt sucrés ?': ['Mostly light or mostly sugary?', 'Eerder light of eerder gesuikerd?'], 'Light / zéro': ['Light / zero', 'Light / zero'],
  'Sucrés (Coca, Orangina, ice tea sucré…)': ['Sugary (Coke, Orangina, sweet iced tea…)', 'Gesuikerd (cola, Orangina, gezoete ice tea…)'], 'Les deux': ['Both', 'Allebei'],
  'Combien de sodas sucrés par semaine ?': ['How many sugary soft drinks per week?', 'Hoeveel gesuikerde frisdranken per week?'],

  // ---- H. difficultes
  'Tes difficultés': ['Your difficulties', 'Je moeilijkheden'], 'Pour un plan qui tient dans la vraie vie.': ['For a plan that holds up in real life.', 'Voor een plan dat standhoudt in het echte leven.'],
  "Tes difficultés aujourd'hui": ['Your difficulties today', 'Je moeilijkheden vandaag'], 'Aucune': ['None', 'Geen'], 'Grignotage': ['Snacking', 'Snoepen tussendoor'],
  'Sucre': ['Sugar', 'Suiker'], 'Restaurants': ['Restaurants', 'Restaurants'], 'Alcool': ['Alcohol', 'Alcohol'],
  'Pas le temps de cuisiner': ['No time to cook', 'Geen tijd om te koken'], 'Week-end qui annule la semaine': ['Weekend that undoes the week', 'Weekend dat de week tenietdoet'],
  'Faim entre les repas': ['Hunger between meals', 'Honger tussen de maaltijden'], 'Soirées difficiles': ['Difficult evenings', 'Moeilijke avonden'],
  'As-tu déjà essayé un régime ?': ['Have you ever tried a diet?', 'Heb je al eens een dieet geprobeerd?'],
  'Est-ce que ça a fonctionné ?': ['Did it work?', 'Heeft het gewerkt?'], "Oui, j'avais eu des résultats": ['Yes, I got results', 'Ja, ik had resultaten'],
  "Non, ça n'a pas tenu ou pas marché": ["No, it didn't last or didn't work", 'Nee, het hield geen stand of werkte niet'],
  'Quel(s) régime(s) as-tu essayé(s) ?': ['Which diet(s) have you tried?', 'Welk(e) dieet/diëten heb je geprobeerd?'],
  'Calories comptées': ['Calorie counting', 'Calorieën tellen'], 'Cétogène': ['Ketogenic', 'Ketogeen'], 'Jeûne intermittent': ['Intermittent fasting', 'Intermittent vasten'],
  'WW / points': ['WW / points', 'WW / punten'], 'Appli gratuite': ['Free app', 'Gratis app'], 'Coach': ['Coach', 'Coach'],
  "Pourquoi ça n'a pas fonctionné ?": ["Why didn't it work?", 'Waarom werkte het niet?'], 'Trop strict': ['Too strict', 'Te streng'], 'Faim': ['Hunger', 'Honger'],
  'Pas le temps': ['No time', 'Geen tijd'], 'Vie sociale': ['Social life', 'Sociaal leven'], 'Stress': ['Stress', 'Stress'],
  'Résultats trop lents': ['Results too slow', 'Te trage resultaten'], 'Budget': ['Budget', 'Budget'], 'Plus de suivi': ['No more follow-up', 'Geen opvolging meer'],
  "Je n'avais pas de vrai pourquoi": ["I didn't have a real reason why", 'Ik had geen echte reden waarom'],
  'Quand tu es stressé, avec la nourriture tu…': ['When you are stressed, with food you…', 'Als je gestrest bent, dan…'],
  "Perds l'appétit": ['Lose your appetite', 'verlies je je eetlust'], 'Grignotes': ['Snack', 'snoep je tussendoor'], 'Commandes': ['Order in', 'bestel je eten'],
  'Te restreins plus': ['Restrict yourself more', 'beperk je je meer'], 'Ça ne change rien': ['Nothing changes', 'verandert er niets'],
  'Message pour ton coach': ['Message for your coach', 'Bericht voor je coach'],
  'Ce que le plan doit absolument prendre en compte': ['What the plan absolutely has to take into account', 'Waar het plan absoluut rekening mee moet houden'],

  // ---- I. sante
  'Ta santé': ['Your health', 'Je gezondheid'],
  'Quelques questions pour un plan sûr. Tes réponses restent entre toi et ton coach.': ['A few questions for a safe plan. Your answers stay between you and your coach.', 'Enkele vragen voor een veilig plan. Je antwoorden blijven tussen jou en je coach.'],
  "Un médecin suit-il actuellement l'un de ces points ?": ['Is a doctor currently following up on any of these?', 'Volgt een arts momenteel een van deze punten op?'],
  'Thyroïde': ['Thyroid', 'Schildklier'], 'Diabète ou prédiabète': ['Diabetes or prediabetes', 'Diabetes of prediabetes'], 'SOPK': ['PCOS', 'PCOS'],
  'Digestion chronique': ['Chronic digestive issues', 'Chronische spijsverteringsproblemen'],
  'Traitement amaigrissant type GLP-1': ['Weight-loss treatment such as GLP-1', 'Vermageringsbehandeling zoals GLP-1'],
  'Grossesse ou allaitement': ['Pregnancy or breastfeeding', 'Zwangerschap of borstvoeding'], 'Précise si tu veux': ['Explain if you wish', 'Licht toe als je wil'],
  'Traitements prescrits en cours': ['Current prescribed treatments', 'Lopende voorgeschreven behandelingen'],
  'Nom du traitement, dose si tu la connais, sinon « je ne sais plus le nom »': ['Name of the treatment, dose if you know it, otherwise “I don\'t remember the name”', 'Naam van de behandeling, dosis als je die kent, anders „ik weet de naam niet meer”'],
  'Compléments actuellement': ['Current supplements', 'Huidige supplementen'],
  'Protéine, créatine, vitamines, « brûleurs »… ou « aucun »': ['Protein, creatine, vitamins, “fat burners”… or “none”', 'Eiwit, creatine, vitaminen, „vetverbranders”… of „geen”'],
  'Trouble alimentaire diagnostiqué ou suivi en cours': ['Diagnosed eating disorder or ongoing treatment', 'Gediagnosticeerde eetstoornis of lopende begeleiding'],
  'Antérieur': ['In the past', 'Vroeger'], 'Suivi en cours': ['Ongoing treatment', 'Lopende begeleiding'], 'Lequel ?': ['Which one?', 'Welke?'],

  // ---- J. sommeil
  'Sommeil et stress': ['Sleep and stress', 'Slaap en stress'], 'Ils pèsent lourd sur la faim et les résultats.': ['They weigh heavily on hunger and results.', 'Ze wegen zwaar door op honger en resultaten.'],
  'Heures de sommeil par nuit, en vrai': ['Hours of sleep per night, really', 'Uren slaap per nacht, echt'], 'Chaotique': ['Chaotic', 'Chaotisch'],
  'Qualité du sommeil': ['Sleep quality', 'Slaapkwaliteit'], 'Mauvaise': ['Poor', 'Slecht'], 'Excellente': ['Excellent', 'Uitstekend'],
  'Stress ces 4 dernières semaines': ['Stress over the last 4 weeks', 'Stress de voorbije 4 weken'], 'Zen': ['Calm', 'Zen'], 'Au max': ['Maxed out', 'Maximaal'],
  'Sources de stress': ['Sources of stress', 'Bronnen van stress'], 'Travail': ['Work', 'Werk'], 'Argent': ['Money', 'Geld'], 'Famille': ['Family', 'Familie'],
  'Image du corps': ['Body image', 'Lichaamsbeeld'], 'Santé': ['Health', 'Gezondheid'],

  // ---- L. bonus
  'Bonus : 90 secondes': ['Bonus: 90 seconds', 'Bonus: 90 seconden'], 'Bonus': ['Bonus', 'Bonus'],
  'Facultatif, mais ça rend ton plan encore plus juste.': ['Optional, but it makes your plan even more accurate.', 'Optioneel, maar het maakt je plan nog juister.'],
  '3 aliments que tu veux voir souvent dans le plan': ['3 foods you want to see often in the plan', '3 voedingsmiddelen die je vaak in het plan wil zien'],
  'Petit-déjeuner typique (ou « je ne prends pas »)': ['Typical breakfast (or “I don\'t have one”)', 'Typisch ontbijt (of „ik ontbijt niet”)'],
  'Dîner typique': ['Typical dinner', 'Typisch avondmaal'],
  // ---- interface du questionnaire (QuestionnaireCoach.jsx)
  'facultatif': ['optional', 'optioneel'], 'choisi': ['chosen', 'gekozen'], 'choisis': ['chosen', 'gekozen'],
  'Ajouter un autre aliment…': ['Add another food…', 'Nog een voedingsmiddel toevoegen…'], 'Explication': ['Explanation', 'Uitleg'],
  'Plusieurs choix possibles': ['Several choices possible', 'Meerdere keuzes mogelijk'], 'Précise…': ['Specify…', 'Licht toe…'],
  'Gonflement ou malaise\u00A0: cet aliment sera exclu à 100 % de ton plan, sans substitut risqué.': ['Swelling or feeling faint: this food will be 100% excluded from your plan, with no risky substitute.', 'Zwelling of onwel worden: dit voedingsmiddel wordt 100 % uit je plan geschrapt, zonder riskant alternatief.'],
  'Réponds à cette question pour continuer.': ['Answer this question to continue.', 'Beantwoord deze vraag om verder te gaan.'],
  'Enregistrement…': ['Saving…', 'Opslaan…'], 'Gardé sur ce téléphone': ['Kept on this phone', 'Bewaard op deze telefoon'], 'Enregistré': ['Saved', 'Opgeslagen'],
  'MOIS SUIVANT': ['NEXT MONTH', 'VOLGENDE MAAND'], 'PAIEMENT REÇU': ['PAYMENT RECEIVED', 'BETALING ONTVANGEN'],
  'Ton programme commence ici': ['Your programme starts here', 'Je programma begint hier'], 'En cours': ['In progress', 'Bezig'],
  'Il manque une réponse plus haut.': ['An answer is missing above.', 'Er ontbreekt hierboven een antwoord.'],
  'Voir le récapitulatif': ['See the summary', 'Overzicht bekijken'], 'Continuer': ['Continue', 'Verder'],
  'Passer cette section': ['Skip this section', 'Deze sectie overslaan'], 'Reprendre': ['Resume', 'Hervatten'],
  'Récapitulatif': ['Summary', 'Overzicht'], 'DERNIÈRE ÉTAPE': ['LAST STEP', 'LAATSTE STAP'],
  'Tes réponses du mois dernier': ['Your answers from last month', 'Je antwoorden van vorige maand'], 'Tout est bon\u00A0?': ['All good?', 'Alles in orde?'],
  'On a repris tes réponses précédentes. Vérifie, touche « Modifier » pour ce qui a changé (poids, objectif, horaires…), puis envoie à ton coach.':
    ['We have brought back your previous answers. Check them, tap “Edit” for anything that has changed (weight, goal, schedule…), then send to your coach.',
      'We hebben je vorige antwoorden overgenomen. Controleer ze, tik op „Wijzigen” voor wat veranderd is (gewicht, doel, uren…) en stuur ze dan naar je coach.'],
  'Vérifie, puis envoie à ton coach.': ['Check, then send to your coach.', 'Controleer en stuur dan naar je coach.'], 'Modifier': ['Edit', 'Wijzigen'],
  'Tu as signalé un point de santé. Montre ton plan à ton médecin avant de le commencer.': ['You reported a health issue. Show your plan to your doctor before starting it.', 'Je meldde een gezondheidspunt. Toon je plan aan je arts voor je eraan begint.'],
  'Envoyer à mon coach': ['Send to my coach', 'Naar mijn coach sturen'], "Tu recevras ton plan dans l'app et par e-mail.": ['You will receive your plan in the app and by e-mail.', 'Je ontvangt je plan in de app en via e-mail.'],
  'Autres': ['Others', 'Andere'], '6h30': ['6:30', '6.30 u'], '23h': ['11 pm', '23 u'],
};

// Cles comparees sans espaces insecables (le francais en met devant ? et :).
const norme = (x) => x.replace(/[\u00A0\u202F]/g, ' ');
const INDEX = Object.fromEntries(Object.entries(Q).map(([k, v]) => [norme(k), v]));

/** Texte du questionnaire dans la langue de l'app (affichage seulement). */
export function tq(s) {
  if (typeof s !== 'string' || !s) return s;
  const l = langue.value;
  if (l !== 'en' && l !== 'nl') return s;
  const e = INDEX[norme(s)];
  return e ? e[l === 'en' ? 0 : 1] : s;
}
