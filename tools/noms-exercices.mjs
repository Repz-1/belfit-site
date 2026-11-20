import fs from 'fs';
const { EXERCISES } = await import(new URL('../app-v2/src/data/exercices.js', import.meta.url));
const noms = [...new Set(Object.values(EXERCISES).flat().map(e => e.nom))];
// [fr, en, nl] — bases (mouvement), cherchees au debut, la plus longue d'abord
const BASES = [
['Développé Couché','Bench Press','Bankdrukken'],['Développé Poitrine','Chest Press','Chest Press'],['Développé Militaire','Military Press','Military Press'],
['Développé Épaules','Shoulder Press','Schouderdrukken'],['Développé Arnold','Arnold Press','Arnold Press'],['Développé JM','JM Press','JM Press'],['Développé','Press','Drukken'],
['Pompes','Push-Ups','Opdrukken'],['Pull-Over','Pullover','Pullover'],['Pec Deck','Pec Deck','Pec Deck'],['Écarté','Fly','Flyes'],['Vis-à-Vis','Crossover','Crossover'],
['Élévation Latérale et Frontale','Lateral and Front Raise','Zij- en Voorwaarts Heffen'],['Élévation Frontale et Pull-Over','Front Raise and Pullover','Voorwaarts Heffen en Pullover'],
['Élévation Frontale','Front Raise','Voorwaarts Heffen'],['Élévation Latérale','Lateral Raise','Zijwaarts Heffen'],
['Extension Dos','Back Extension','Rugextensie'],['Extension Lombaire au Sol','Floor Lower Back Extension','Onderrugextensie op de Grond'],['Extension Triceps','Triceps Extension','Tricepsextensie'],
['Extension Jambes','Leg Extension','Beenstrekken'],['Extension Mollets','Calf Raise','Kuitheffen'],['Presse Mollets','Calf Press','Kuitpers'],['Presse à Cuisses','Leg Press','Beenpers'],
['Tirage Bras Tendus','Straight-Arm Pulldown','Pulldown met Gestrekte Armen'],['Tirage Poitrine','Lat Pulldown','Lat Pulldown'],['Tirage Menton','Upright Row','Upright Row'],['Tirage vers Visage','Face Pull','Face Pull'],
['Flexion Buste Avant','Good Morning','Good Morning'],['Flexion Latérale','Side Bend','Zijwaartse Buiging'],['Rack Pull','Rack Pull','Rack Pull'],['Rowing','Row','Roeien'],
['Soulevé de Terre','Deadlift','Deadlift'],['Superman','Superman','Superman'],['Tractions','Pull-Ups','Optrekken'],['Arraché','Snatch','Snatch'],['Jeté','Jerk','Jerk'],
['Épaulé-Jeté','Clean and Jerk','Clean and Jerk'],['Épaulé en Puissance','Power Clean','Power Clean'],['Épaulé en Suspension','Hang Clean','Hang Clean'],['Épaulé','Clean','Clean'],
['Oiseau','Rear Delt Fly','Rear Delt Flyes'],['Push Press','Push Press','Push Press'],['Relevé Turc','Turkish Get-Up','Turkish Get-Up'],['Thruster','Thruster','Thruster'],
['Haussement d’Épaules','Shrug','Schouderophalen'],['Curl Araignée','Spider Curl','Spider Curl'],['Curl Biceps','Biceps Curl','Bicepscurl'],['Curl Concentré','Concentration Curl','Concentratiecurl'],
['Curl Marteau','Hammer Curl','Hammercurl'],['Curl Poignet','Wrist Curl','Polscurl'],['Curl Pupitre','Preacher Curl','Preacher Curl'],['Drag Curl','Drag Curl','Drag Curl'],
['Barre au Front','Skull Crusher','Skull Crusher'],['Dips entre Bancs','Bench Dips','Bankdips'],['Dips','Dips','Dips'],['Kickback Triceps','Triceps Kickback','Triceps Kickback'],['Kickback Fessier','Glute Kickback','Glute Kickback'],
['Adduction Hanche','Hip Adduction','Heupadductie'],['Box Jump','Box Jump','Box Jump'],['Box Squat','Box Squat','Box Squat'],['Hyperextension','Hyperextension','Hyperextensie'],
['Fentes','Lunges','Lunges'],['Glute Ham Raise','Glute Ham Raise','Glute Ham Raise'],['Goblet Squat','Goblet Squat','Goblet Squat'],['Hack Squat','Hack Squat','Hack Squat'],['Hip Thrust','Hip Thrust','Hip Thrust'],
['Leg Curl','Leg Curl','Leg Curl'],['Relevé de Bassin','Glute Bridge','Bekkenheffen'],['Step Up avec Montée de Genou','Step-Up with Knee Raise','Step-Up met Knieheffen'],['Step Up','Step-Up','Step-Up'],
['Relevé de Jambes','Leg Raise','Beenheffen'],['Split Squat','Split Squat','Split Squat'],['Sissy Squat','Sissy Squat','Sissy Squat'],['Squat Pistolet','Pistol Squat','Pistol Squat'],['Squat','Squat','Squat'],
['Swing','Swing','Swing'],['Bent Press','Bent Press','Bent Press'],['Ciseaux de Jambes','Scissor Kicks','Scharen'],['Cocon','Tuck Crunch','Tuck Crunch'],['Crunch Bicyclette','Bicycle Crunch','Fietscrunch'],
['Crunch Coude-Genou','Elbow-to-Knee Crunch','Elleboog-Knie Crunch'],['Crunch','Crunch','Crunch'],['Dead Bug','Dead Bug','Dead Bug'],['Double Windmill','Double Windmill','Double Windmill'],['Windmill','Windmill','Windmill'],
['Figure 8','Figure 8','Figure 8'],['Gainage Latéral','Side Plank','Zijplank'],['Judo Flip','Judo Flip','Judo Flip'],['Landmine 180°','Landmine 180°','Landmine 180°'],['Pallof Press','Pallof Press','Pallof Press'],
['Passage entre les Jambes','Between-the-Legs Pass','Doorgeven tussen de Benen'],['Planche Dauphin','Dolphin Plank','Dolfijnplank'],['Planche','Plank','Plank'],['Ramené de Genoux','Knee Tuck','Knieën Intrekken'],
['Rollout','Rollout','Rollout'],['Rotation Russe','Russian Twist','Russian Twist'],['Rotations du Buste','Torso Twist','Romprotatie'],['Sit-Up','Sit-Up','Sit-Up'],['Spell Caster','Spell Caster','Spell Caster'],
['Spider Crawl','Spider Crawl','Spider Crawl'],['Sprints Courts','Short Sprints','Korte Sprints'],['Toucher Orteils','Toe Touches','Tenen Aantikken'],['Touches de Talons Alternées','Alternating Heel Touches','Afwisselend Hielen Aantikken'],
['V-Up','V-Up','V-Up'],['Vacuum Abdominal','Stomach Vacuum','Stomach Vacuum'],['Woodchop Ascendant','Low-to-High Woodchop','Woodchop van Laag naar Hoog'],['Woodchop Descendant','High-to-Low Woodchop','Woodchop van Hoog naar Laag'],
].sort((a,b)=>b[0].length-a[0].length);
// modificateurs [fr, en, nl, place en: 'av' devant le mouvement | 'ap' apres]
const MODS = [
['au-dessus de la Tête','Overhead','Boven het Hoofd'],['Prise Large','Wide-Grip','Brede Greep'],['Prise Serrée','Close-Grip','Smalle Greep'],['Prise Inversée','Reverse-Grip','Omgekeerde Greep'],
['Un Bras','Single-Arm','Eenarmig'],['Une Jambe','Single-Leg','Eenbenig'],['Jambes Tendues','Stiff-Leg','Gestrekte Benen'],['Bras Tendus','Straight-Arm','Gestrekte Armen'],['à Genoux','Kneeling','Knielend'],
['avec Élastique','with Band','met Weerstandsband'],['avec Rotation','with Rotation','met Rotatie'],['avec Relevé de Bassin','with Hip Raise','met Bekkenheffen'],['depuis un Banc','from a Bench','vanaf een Bank'],
['sur Banc Plat','on Flat Bench','op Vlakke Bank'],['Genoux Fléchis','Bent-Knee','Gebogen Knieën'],['Incliné','Incline','Schuin'],['Inclinées','Incline','Schuin'],['Décliné','Decline','Decline'],
['Assis','Seated','Zittend'],['Debout','Standing','Staand'],['Allongé','Lying','Liggend'],['Penché','Bent-Over','Voorovergebogen'],['Penchée','Bent-Over','Voorovergebogen'],['Alterné','Alternating','Afwisselend'],
['Inversé','Reverse','Omgekeerd'],['Inversée','Reverse','Omgekeerd'],['Arrière','Rear','Achterwaarts'],['Avant','Front','Voor'],['Latéral','Side','Zijwaarts'],['Latérales','Side','Zijwaarts'],['Corde','Rope','Touw'],
['Nuque','Behind-the-Neck','Achter de Nek'],['Suspendu','Hanging','Hangend'],['Sauté','Jump','Sprong'],['Lesté','Weighted','Verzwaard'],['Roumain','Romanian','Roemeense'],['Sumo','Sumo','Sumo'],
['Supination','Chin-Up Grip','Onderhandse Greep'],['Militaire','Military','Military'],['Guidé','Guided','Geleid'],['Tendues','Straight','Gestrekt'],['Avancé','Advanced','Gevorderd'],
].sort((a,b)=>b[0].length-a[0].length);
const EQ = { 'Barre':['Barbell','Halterstang'],'Haltère':['Dumbbell','Dumbbell'],'Poulie':['Cable','Kabel'],'Machine':['Machine','Machine'],'Machine Smith':['Smith Machine','Smith-machine'],
 'Kettlebell':['Kettlebell','Kettlebell'],'Élastique':['Band','Weerstandsband'],'Barre EZ':['EZ Bar','EZ-stang'] };
const POST_EN = new Set(['with Band','with Rotation','with Hip Raise','from a Bench','on Flat Bench']);
const POST_NL = new Set(['met Weerstandsband','met Rotatie','met Bekkenheffen','vanaf een Bank','op Vlakke Bank','Boven het Hoofd','met Brede Greep','met Smalle Greep','met Omgekeerde Greep','met Onderhandse Greep','met Gestrekte Benen','met Gestrekte Armen','Achter de Nek','met Touw','met Gebogen Knieën']);
const VERS_POST = { 'Brede Greep':'met Brede Greep','Smalle Greep':'met Smalle Greep','Omgekeerde Greep':'met Omgekeerde Greep','Onderhandse Greep':'met Onderhandse Greep','Gestrekte Benen':'met Gestrekte Benen','Gestrekte Armen':'met Gestrekte Armen','Touw':'met Touw','Gebogen Knieën':'met Gebogen Knieën' };
// Adjectif devant un nom en de/het (curl, squat…) : terminaison -e. Devant un verbe substantive (bankdrukken) : forme nue.
const BUIG = { Schuin:'Schuine', Staand:'Staande', Zittend:'Zittende', Liggend:'Liggende', Eenarmig:'Eenarmige', Eenbenig:'Eenbenige', Afwisselend:'Afwisselende', Omgekeerd:'Omgekeerde', Knielend:'Knielende', Hangend:'Hangende', Verzwaard:'Verzwaarde', Achterwaarts:'Achterwaartse', Zijwaarts:'Zijwaartse', Geleid:'Geleide', Gestrekt:'Gestrekte', Gevorderd:'Gevorderde', Voor:'Voorwaartse', Sprong:'Sprong' };
const OVR = {
  'Tractions Supination': ['Chin-Ups', 'Chin-Ups'], 'Tractions Prise Large Arrière': ['Wide-Grip Behind-the-Neck Pull-Ups', 'Optrekken met Brede Greep Achter de Nek'],
  'Fentes Arrière (Haltère)': ['Reverse Lunges (Dumbbell)', 'Achterwaartse Lunges (Dumbbell)'], 'Squat Avant (Barre)': ['Front Squat (Barbell)', 'Front Squat (Halterstang)'],
  'Squat Avant (Kettlebell)': ['Front Squat (Kettlebell)', 'Front Squat (Kettlebell)'], 'Squat Sauté': ['Jump Squat', 'Jump Squat'], 'Squat Lesté Sauté (Barre)': ['Weighted Jump Squat (Barbell)', 'Verzwaarde Jump Squat (Halterstang)'],
  'Squat à Genoux Sauté (Barre)': ['Kneeling Jump Squat (Barbell)', 'Knielende Jump Squat (Halterstang)'], 'Relevé de Jambes Avant': ['Front Leg Raise', 'Beenheffen naar Voren'],
  'Relevé de Jambes Arrière': ['Rear Leg Raise', 'Beenheffen naar Achteren'], 'Relevé de Jambes Latéral': ['Side Leg Raise', 'Zijwaarts Beenheffen'],
  'Tirage Poitrine Prise Serrée Avant (Poulie)': ['Close-Grip Front Lat Pulldown (Cable)', 'Lat Pulldown met Smalle Greep (Kabel)'],
  'Tirage Bras Tendus Corde (Poulie)': ['Rope Straight-Arm Pulldown (Cable)', 'Pulldown met Gestrekte Armen en Touw (Kabel)'],
  'Oiseau Inversé (Haltère)': ['Reverse Rear Delt Fly (Dumbbell)', 'Omgekeerde Rear Delt Flyes (Dumbbell)'],
};
const res = {}, ko = [];
for (const n of noms) {
  let m = n.match(/^(.*?)(?: \(([^)]+)\))?$/); let corps = m[1], eq = m[2];
  const b = BASES.find(x => corps === x[0] || corps.startsWith(x[0] + ' '));
  if (!b) { ko.push(n); continue; }
  let reste = corps.slice(b[0].length).trim(); const mods = [];
  while (reste) { const x = MODS.find(x => reste === x[0] || reste.startsWith(x[0] + ' ')); if (!x) break; mods.push(x); reste = reste.slice(x[0].length).trim(); }
  if (reste || (eq && !EQ[eq])) { ko.push(n + '  [reste: ' + reste + ']'); continue; }
  const en = [...mods.filter(x=>!POST_EN.has(x[1])).map(x=>x[1]), b[1], ...mods.filter(x=>POST_EN.has(x[1])).map(x=>x[1])].join(' ') + (eq ? ' (' + EQ[eq][0] + ')' : '');
  const ms = (b[0] === 'Oiseau' ? mods.filter(x => x[0] !== 'Arrière') : mods);
  const verbe = /en$/.test(b[2]);
  const nlm = ms.map(x => VERS_POST[x[2]] || x[2]);
  const avant = nlm.filter(x => !POST_NL.has(x)).map(x => verbe ? x : (BUIG[x] || x));
  const nl = [...avant, b[2], ...nlm.filter(x => POST_NL.has(x))].join(' ') + (eq ? ' (' + EQ[eq][1] + ')' : '');
  const en2 = b[0] === 'Oiseau' ? [...ms.filter(x=>!POST_EN.has(x[1])).map(x=>x[1]), b[1], ...ms.filter(x=>POST_EN.has(x[1])).map(x=>x[1])].join(' ') + (eq ? ' (' + EQ[eq][0] + ')' : '') : en;
  res[n] = OVR[n] || [en2, nl];
}
const sortie = new URL('../app-v2/src/data/exercices-noms.js', import.meta.url);
fs.writeFileSync(sortie, `// GENERE par tools/noms-exercices.mjs — ne pas editer a la main (modifier le script puis le relancer).
// Noms d'exercices en anglais et neerlandais, a l'affichage seulement. Le nom
// francais reste la cle enregistree (historique, charges, mes seances).
// Format : 'nom francais': ['anglais', 'neerlandais'].
export const NOMS_EXOS = {\n` + Object.entries(res).map(([k, v]) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(v) + ',').join('\n') + '\n};\n');
console.log('KO', ko.length, ko.join('\n'));
for (const [k, v] of Object.entries(res)) console.log(k, ' => ', v[0], ' | ', v[1]);
