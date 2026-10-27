// Base d'aliments BELFIT — extraite de app.html.
// Valeurs pour 100g/100ml. unit = poids d'une piece, unitLabel = son nom.
export const DB = {
    // Céréales & féculents
    'Avoine':{kcal:380,prot:13,carbs:66,lip:8,fibres:10.6,sucres:1.2,satures:1.22,sel:0.01},
    'Flocons avoine':{kcal:380,prot:13,carbs:66,lip:8,fibres:10.2,sucres:0.97,satures:1.13,sel:0.01},
    'Riz cru':{kcal:347,prot:7,carbs:77,lip:0.7,fibres:1.05,sucres:0.16,satures:0.2,sel:0.01},
    'Riz cuit':{kcal:130,prot:2.7,carbs:28,lip:0.3,fibres:0.8,sucres:0.2,satures:0.08,sel:0.01},
    'Pâtes blanches crues':{kcal:371,prot:13,carbs:75,lip:1.1},
    'Pâtes blanches cuites':{kcal:158,prot:5.8,carbs:31,lip:0.9},
    'Pain complet':{kcal:247,prot:9,carbs:43,lip:3.4,fibres:6.9,sucres:2.2,satures:0.52,sel:1.12},
    'Pain blanc':{kcal:265,prot:9,carbs:49,lip:3.2,fibres:2.6,satures:0.17,sel:1.45},
    'Pomme de terre':{kcal:77,prot:2,carbs:17,lip:0.1,fibres:1.8,sucres:0.78,satures:0.04,sel:0.02,cache:true},
    'Patate douce':{kcal:86,prot:1.6,carbs:20,lip:0.1,fibres:2.87,sucres:5.64,satures:0.06,sel:0.1,cache:true},
    'Quinoa cru':{kcal:368,prot:14,carbs:64,lip:6,fibres:7,satures:0.71,sel:0.01},
    'Semoule':{kcal:360,prot:12,carbs:73,lip:1.8,fibres:3.37,sucres:1,satures:0.21,sel:0},
    // Produit SEC (poudre), tel que vendu. Source : etiquette « Creme de riz » Snackfit (France), Open Food Facts 3012003251416 : 372 kcal, 7,7 g prot, 83,1 g glucides, 0,7 g lip, fibres 1,5, sucres 0,2, satures 0,1, sel 0,025. Recoupement : USDA « Cereals, Cream of Rice, dry » 370 kcal / 6,3 / 82,4 / 0,5.
    'Crème de riz':{kcal:372,prot:7.7,carbs:83.1,lip:0.7,fibres:1.5,sucres:0.2,satures:0.1,sel:0.025},
    // Protéines
    'Poulet cuit':{kcal:165,prot:31,carbs:0,lip:3.6,fibres:0,sucres:0,satures:0.58,sel:0.14},
    'Poulet cru':{kcal:120,prot:23,carbs:0,lip:2.6,fibres:0,sucres:0,satures:0.44,sel:0.11},
    'Dinde escalope crue':{kcal:104,prot:24,carbs:0,lip:1,fibres:0,sucres:0.32,satures:0.29,sel:0.2},
    'Dinde escalope cuite':{kcal:135,prot:29,carbs:0,lip:1.7,fibres:0,sucres:0,satures:1,sel:0.25},
    'Poulet haché cru':{kcal:185,prot:17,carbs:0,lip:13},
    'Poulet haché cuit':{kcal:230,prot:24,carbs:0,lip:15},
    'Haché de blanc de poulet cru':{kcal:110,prot:22,carbs:0,lip:2},
    'Haché de blanc de poulet cuit':{kcal:150,prot:29,carbs:0,lip:3.5},
    'Dinde hachée crue':{kcal:150,prot:18,carbs:0,lip:8.5},
    'Dinde hachée cuite':{kcal:195,prot:25,carbs:0,lip:10},
    // Variantes "Haché de..." (même produit, autre façon de l'écrire)
    'Haché de poulet cru':{kcal:185,prot:17,carbs:0,lip:13},
    'Haché de poulet cuit':{kcal:230,prot:24,carbs:0,lip:15},
    'Haché de dinde cru':{kcal:150,prot:18,carbs:0,lip:8.5},
    'Haché de dinde cuit':{kcal:195,prot:25,carbs:0,lip:10},
    'Haché de boeuf 5% cru':{kcal:137,prot:20,carbs:0,lip:5},
    'Haché de boeuf 5% cuit':{kcal:170,prot:26,carbs:0,lip:7},
    'Haché de boeuf 15% cru':{kcal:215,prot:19,carbs:0,lip:15,fibres:1.55,sucres:0.57,satures:4.45,sel:0.87},
    'Haché de boeuf 15% cuit':{kcal:250,prot:26,carbs:0,lip:16},
    'Haché de boeuf 20% cru':{kcal:254,prot:18,carbs:0,lip:20},
    'Cuisse de poulet cuite':{kcal:209,prot:26,carbs:0,lip:11},
    'Boeuf hache 5% cru':{kcal:137,prot:20,carbs:0,lip:5,fibres:0,sucres:0,satures:1.64,sel:0.1},
    'Boeuf hache 5% cuit':{kcal:170,prot:26,carbs:0,lip:7,fibres:0,sucres:0,satures:2.67,sel:0.16},
    'Boeuf hache 15% cru':{kcal:215,prot:19,carbs:0,lip:15,fibres:0,sucres:0,satures:5.71,sel:0.1},
    'Boeuf hache 15% cuit':{kcal:250,prot:24,carbs:0,lip:17,fibres:0,sucres:0,satures:7.08,sel:0.21},
    'Boeuf hache 20% cru':{kcal:254,prot:18,carbs:0,lip:20,fibres:0,sucres:0,satures:7.99,sel:0.16},
    'Steak cru':{kcal:158,prot:26,carbs:0,lip:6},
    'Steak cuit':{kcal:217,prot:30,carbs:0,lip:11},
    'Bavette cuite':{kcal:195,prot:28,carbs:0,lip:9},
    'Saumon cru':{kcal:208,prot:20,carbs:0,lip:13,fibres:0,sucres:0,satures:1.92,sel:0.12},
    'Saumon cuit':{kcal:232,prot:25,carbs:0,lip:14,fibres:0,sucres:0,satures:2.39,sel:0.13},
    'Saumon fume':{kcal:182,prot:25,carbs:0,lip:9,fibres:0.25,sucres:0,satures:2.06,sel:3.51},
    'Thon naturel boite':{kcal:116,prot:26,carbs:0,lip:1},
    'Thon frais cru':{kcal:144,prot:23,carbs:0,lip:5},
    'Cabillaud cru':{kcal:82,prot:18,carbs:0,lip:0.7,fibres:0.2,sucres:0,satures:0.1,sel:0.23},
    'Cabillaud cuit':{kcal:105,prot:23,carbs:0,lip:0.9,fibres:0,sucres:0,satures:0.16,sel:0.16},
    // ===== OEUFS =====
    'Oeuf entier S (44g)':{kcal:155,prot:13,carbs:1.1,lip:11,unit:44,unitLabel:'oeuf'},
    'Oeuf entier M (50g)':{kcal:155,prot:13,carbs:1.1,lip:11,unit:50,unitLabel:'oeuf'},
    'Oeuf entier L (58g)':{kcal:155,prot:13,carbs:1.1,lip:11,unit:58,unitLabel:'oeuf'},
    'Oeuf entier (au gramme)':{kcal:155,prot:13,carbs:1.1,lip:11},
    'Crevettes':{kcal:99,prot:24,carbs:0.2,lip:0.3,fibres:0,sucres:0,satures:0.19,sel:0.45},
    'Jambon blanc':{kcal:110,prot:18,carbs:1,lip:3.5,fibres:0.39,sucres:1.08,satures:0.54,sel:1.9},
    // Produits laitiers
    'Whey Iso':{kcal:360,prot:90,carbs:2,lip:1},
    'Whey':{kcal:400,prot:80,carbs:8,lip:6},
    'Fromage blanc 0%':{kcal:47,prot:8,carbs:4,lip:0.2,fibres:0,sucres:3.89,satures:0.03,sel:0.11},
    'Skyr':{kcal:63,prot:11,carbs:4,lip:0.2},
    'Yaourt grec':{kcal:120,prot:3.5,carbs:4.2,lip:6.5},
    'Lait 1/2 écrémé':{kcal:46,prot:3.2,carbs:4.8,lip:1.5},
    'Mozzarella':{kcal:280,prot:28,carbs:3,lip:17,fibres:0,sucres:0.7,satures:11.7,sel:0.6},
    'Parmesan':{kcal:392,prot:36,carbs:3,lip:26,fibres:0,sucres:0,satures:20.6,sel:1.57},
    'Comté':{kcal:410,prot:27,carbs:0,lip:34,fibres:0,sucres:0,satures:22.5,sel:0.8},
    // Légumineuses
    'Lentilles cuites':{kcal:116,prot:9,carbs:20,lip:0.4,fibres:7.9,sucres:1.8,satures:0.05,sel:0.01},
    'Pois chiches cuits':{kcal:164,prot:9,carbs:27,lip:2.6,fibres:8.2,sucres:0.3,satures:0.46,sel:0.03},
    'Haricots rouges':{kcal:127,prot:9,carbs:23,lip:0.5,fibres:15.2,sucres:2.1,satures:0.15,sel:0.03},
    // Lipides & oléagineux
    'Huile d\'olive':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:15.2,sel:0.01},
    'Huile de colza':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:7.26,sel:0},
    'Huile olive':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:15.2,sel:0.01,cache:true}, // graphie fautive : gardee pour les journaux existants, masquee de la recherche
    'Huile colza':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:7.26,sel:0,cache:true},
    'Beurre cacahuète':{kcal:588,prot:25,carbs:20,lip:50,fibres:5,sucres:10.5,satures:10.4,sel:0.97,cache:true}, // doublon de « Beurre de cacahuète » : garde pour les journaux existants, masque de la recherche
    'Amandes':{kcal:579,prot:21,carbs:22,lip:50,fibres:12.5,sucres:4.2,satures:4.11,sel:0.01},
    'Noix':{kcal:654,prot:15,carbs:14,lip:65,fibres:8.33,sucres:3.64,satures:6.62,sel:0},
    'Noix de cajou':{kcal:553,prot:18,carbs:30,lip:44,fibres:3.85,sucres:8.01,satures:10.5,sel:1.15},
    'Avocat':{kcal:160,prot:2,carbs:9,lip:15,fibres:3.6,sucres:0.4,satures:4.51,sel:0.01},
    // Fruits
    'Banane':{kcal:89,prot:1.1,carbs:23,lip:0.3,fibres:2.7,sucres:15.6,satures:0.01,sel:0.01},
    'Pomme':{kcal:52,prot:0.3,carbs:14,lip:0.2,fibres:8.7,sucres:54.6,satures:0.06,sel:0.22},
    'Fraises':{kcal:32,prot:0.7,carbs:8,lip:0.3,fibres:3.8,sucres:5.6,satures:0.01,sel:0.01},
    'Myrtilles':{kcal:57,prot:0.7,carbs:14,lip:0.3,fibres:2.4,sucres:9.96,satures:0.03,sel:0},
    'Orange':{kcal:47,prot:0.9,carbs:12,lip:0.1,fibres:2.7,sucres:7.6,satures:0.01,sel:0.01},
    'Dattes':{kcal:282,prot:2.5,carbs:75,lip:0.4,fibres:7.3,sucres:64.7,satures:0.07,sel:0.1},
    'Raisins secs':{kcal:299,prot:3,carbs:79,lip:0.5},
    // Légumes
    'Brocoli':{kcal:34,prot:2.8,carbs:7,lip:0.4,fibres:2.9,sucres:1.7,satures:0.06,sel:0.05,cache:true},
    'Épinards':{kcal:23,prot:2.9,carbs:3.6,lip:0.4,fibres:2.37,sucres:0.32,satures:0.06,sel:0.17},
    'Courgette':{kcal:17,prot:1.2,carbs:3,lip:0.3,fibres:1.5,sucres:2.3,satures:1.3,sel:0.6},
    'Tomate':{kcal:18,prot:0.9,carbs:3.9,lip:0.2,fibres:1.2,sucres:2.48,satures:0.06,sel:0.01},
    'Carotte':{kcal:41,prot:0.9,carbs:10,lip:0.2,fibres:2.7,sucres:6,satures:0.01,sel:0.11},
    // ===== PROTÉINES (muscu) =====
    'Caséine':{kcal:360,prot:80,carbs:5,lip:1.5},
    'Protéine de pois':{kcal:380,prot:80,carbs:5,lip:6},
    'Tofu':{kcal:76,prot:8,carbs:1.9,lip:4.8,fibres:0.5,sucres:0.57,satures:1.35,sel:0.03},
    'Tempeh':{kcal:192,prot:20,carbs:7.6,lip:11,fibres:6.2,sucres:0.24,satures:0.57,sel:0.1},
    'Seitan':{kcal:370,prot:75,carbs:14,lip:1.9,fibres:0.9,sucres:0.81,satures:0.38,sel:1.13},
    'Edamame':{kcal:121,prot:12,carbs:9,lip:5},
    'Sardines':{kcal:208,prot:25,carbs:0,lip:11,fibres:0,sucres:0,satures:2.4,sel:0.22},
    'Maquereau':{kcal:205,prot:19,carbs:0,lip:14,fibres:0,sucres:0,satures:3.22,sel:0.16},
    'Truite':{kcal:119,prot:20,carbs:0,lip:3.5,fibres:0,sucres:0,satures:0.62,sel:0.14,cache:true},
    'Colin/Lieu':{kcal:80,prot:17,carbs:0,lip:1,cache:true},
    'Jambon de dinde':{kcal:105,prot:18,carbs:1,lip:3,fibres:0.39,sucres:1.08,satures:0.54,sel:1.9},
    'Bresaola':{kcal:151,prot:32,carbs:0.5,lip:2,fibres:0,sucres:0,satures:2.04,sel:3.46},
    'Filet de porc':{kcal:143,prot:21,carbs:0,lip:6},
    'Moules':{kcal:86,prot:12,carbs:3.7,lip:2.2,fibres:0,sucres:0,satures:0.45,sel:0.85},
    'Foie de bœuf':{kcal:135,prot:20,carbs:3.9,lip:3.6},
    // ===== GLUCIDES (énergie) =====
    'Riz basmati cru':{kcal:350,prot:8,carbs:78,lip:0.5,fibres:0.92,sucres:0.17,satures:0.19,sel:0.01},
    'Galette de riz':{kcal:387,prot:8,carbs:81,lip:3,fibres:2.9,sucres:0.73,satures:0.54,sel:0.18},
    'Wrap/Tortilla':{kcal:310,prot:8,carbs:50,lip:8},
    'Pain de mie complet':{kcal:250,prot:9,carbs:42,lip:4,fibres:6.23,sucres:5.69,satures:0.96,sel:1.18},
    'Müesli':{kcal:370,prot:10,carbs:66,lip:7,fibres:6.4,sucres:25.9,satures:5.04,sel:0.7},
    'Boulgour cru':{kcal:342,prot:12,carbs:76,lip:1.3,fibres:9.57,sucres:0.41,satures:0.27,sel:0.04},
    'Cornflakes':{kcal:378,prot:7,carbs:84,lip:0.9},
    'Couscous cuit':{kcal:112,prot:3.8,carbs:23,lip:0.2},
    'Maïs':{kcal:96,prot:3.4,carbs:19,lip:1.5,fibres:5.7,sucres:1.6,sel:0.01},
    'Pancake':{kcal:227,prot:6,carbs:28,lip:9},
    'Miel':{kcal:304,prot:0.3,carbs:82,lip:0,fibres:0,sucres:79.8,satures:0,sel:0.01},
    'Confiture':{kcal:250,prot:0.4,carbs:62,lip:0.1,fibres:0.58,sucres:51.7,satures:2.87,sel:0.27},
    // ===== SUPPLÉMENTS / SPÉCIAL MUSCU =====
    'Maltodextrine':{kcal:380,prot:0,carbs:95,lip:0},
    'Gainer':{kcal:380,prot:25,carbs:60,lip:5},
    'Barre protéinée':{kcal:350,prot:30,carbs:35,lip:10},
    'Purée amande':{kcal:614,prot:21,carbs:19,lip:56},
    // ===== LAITIERS =====
    'Cottage cheese':{kcal:98,prot:11,carbs:3.4,lip:4.3},
    'Petit suisse 0%':{kcal:75,prot:8,carbs:4,lip:0.2},
    'Lait écrémé':{kcal:35,prot:3.4,carbs:5,lip:0.1,fibres:0,sucres:4.64,satures:0.03,sel:0.1},
    'Lait amande':{kcal:24,prot:0.5,carbs:3,lip:1.1},
    // ===== LIPIDES / GRAINES =====
    'Noisettes':{kcal:628,prot:15,carbs:17,lip:61,fibres:11.6,sucres:4.9,satures:4.75,sel:0.01},
    'Pistaches':{kcal:562,prot:20,carbs:28,lip:45,fibres:10.1,sucres:7.74,satures:5.52,sel:0.01},
    'Graines de chia':{kcal:486,prot:17,carbs:42,lip:31},
    'Graines de lin':{kcal:534,prot:18,carbs:29,lip:42},
    'Graines de courge':{kcal:559,prot:30,carbs:11,lip:49},
    'Graines de tournesol':{kcal:584,prot:21,carbs:20,lip:51},
    'Beurre':{kcal:717,prot:0.9,carbs:0.1,lip:81,fibres:0,sucres:0,satures:52.9,sel:2.52},
    'Huile de coco':{kcal:862,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:86.5,sel:0},
    // ===== FRUITS =====
    'Ananas':{kcal:50,prot:0.5,carbs:13,lip:0.1,fibres:1.2,sucres:10.5,satures:0.01,sel:0.01},
    'Kiwi':{kcal:61,prot:1.1,carbs:15,lip:0.5,fibres:2.4,sucres:8.9,satures:0.13,sel:0.01},
    'Mangue':{kcal:60,prot:0.8,carbs:15,lip:0.4,fibres:1.6,sucres:12.9,satures:0.01,sel:0.01},
    'Pastèque':{kcal:30,prot:0.6,carbs:8,lip:0.2,fibres:0.5,sucres:7.9,satures:0.01,sel:0.01},
    'Melon':{kcal:34,prot:0.8,carbs:8,lip:0.2,fibres:0.75,sucres:4.3,satures:0.04,sel:0.06},
    'Poire':{kcal:57,prot:0.4,carbs:15,lip:0.1,fibres:2.76,sucres:21,satures:5.19,sel:0.04},
    'Pêche':{kcal:39,prot:0.9,carbs:10,lip:0.3,fibres:1.54,sucres:18.2,satures:1.62,sel:0.06},
    'Abricots secs':{kcal:241,prot:3.4,carbs:63,lip:0.5},
    'Pruneaux':{kcal:240,prot:2.2,carbs:64,lip:0.4},
    // ===== LÉGUMES =====
    'Haricots verts':{kcal:31,prot:1.8,carbs:7,lip:0.1,fibres:2.85,sucres:3.26,satures:0.06,sel:0.01},
    'Chou-fleur':{kcal:25,prot:1.9,carbs:5,lip:0.3,fibres:2.2,sucres:1.7,satures:0.24,sel:0.01},
    'Poivron':{kcal:31,prot:1,carbs:6,lip:0.3,fibres:3.2,sucres:3,satures:0.01,sel:0.01},
    'Champignons':{kcal:22,prot:3.1,carbs:3.3,lip:0.3,fibres:1.93,sucres:1.7,satures:0.07,sel:0.02},
    'Concombre':{kcal:15,prot:0.7,carbs:3.6,lip:0.1,fibres:0.8,sucres:1.8,satures:0.01,sel:0.01},
    'Petits pois':{kcal:81,prot:5.4,carbs:14,lip:0.4,fibres:5.5,sucres:5.67,satures:0.1,sel:0.01},
    'Asperges':{kcal:20,prot:2.2,carbs:3.9,lip:0.1,fibres:1.95,sucres:1.88,satures:0.05,sel:0.01},
    'Betterave':{kcal:43,prot:1.6,carbs:10,lip:0.2,fibres:2.55,sucres:6.76,satures:0.04,sel:0.15},
    // ===== AJOUTS VIANDES & POISSONS =====
    'Agneau cuit':{kcal:294,prot:25,carbs:0,lip:21,fibres:0,sucres:0,satures:2.63,sel:0.19},
    'Veau escalope cuite':{kcal:172,prot:31,carbs:0,lip:5,fibres:0,satures:0.82,sel:0.15},
    'Canard magret cuit':{kcal:230,prot:28,carbs:0,lip:13},
    'Lardons':{kcal:330,prot:15,carbs:1,lip:30,fibres:0.38,sucres:0.78,satures:7.91,sel:2.72},
    'Chorizo':{kcal:455,prot:24,carbs:2,lip:38,fibres:0.93,sucres:2.01,satures:14.3,sel:4.24},
    'Merguez':{kcal:280,prot:15,carbs:1,lip:24,fibres:0,sucres:2,satures:11.2,sel:1.48},
    'Saucisse de poulet':{kcal:172,prot:17,carbs:2,lip:11},
    'Rillettes':{kcal:400,prot:16,carbs:0,lip:38,fibres:0.21,sucres:0.13,satures:14.8,sel:1.28},
    'Dorade cuite':{kcal:127,prot:23,carbs:0,lip:4,fibres:0,sucres:0,satures:1.3,sel:0.18},
    'Bar/Loup cuit':{kcal:124,prot:23,carbs:0,lip:3,fibres:0,sucres:0,satures:1.27,sel:0.17},
    'Sole cuite':{kcal:91,prot:18,carbs:0,lip:1.5,fibres:0,sucres:0,satures:0.2,sel:0.41},
    'Hareng':{kcal:158,prot:18,carbs:0,lip:9,fibres:0,sucres:0,satures:2.82,sel:0.22},
    'Anchois':{kcal:131,prot:20,carbs:0,lip:5,fibres:0,sucres:0,satures:1.64,sel:0.18},
    'Calamar':{kcal:92,prot:16,carbs:3,lip:1.4},
    'Surimi':{kcal:95,prot:8,carbs:14,lip:1,fibres:1,sucres:2.8,satures:3.84,sel:1.72},
    'Crabe':{kcal:97,prot:19,carbs:0,lip:1.5,fibres:0,sucres:0,satures:0.47,sel:0.69},
    'Saint-Jacques':{kcal:88,prot:17,carbs:2.4,lip:0.8},
    // ===== AJOUTS FÉCULENTS & CÉRÉALES =====
    'Riz complet cru':{kcal:360,prot:8,carbs:74,lip:2.8,fibres:5,sucres:0.66,satures:0.61,sel:0.01},
    'Riz complet cuit':{kcal:111,prot:2.6,carbs:23,lip:0.9,fibres:2.3,sucres:0.2,satures:0.17,sel:0.01},
    'Riz thai cru':{kcal:352,prot:7,carbs:78,lip:0.6,fibres:0.92,sucres:0.17,satures:0.19,sel:0.01},
    'Pâtes complètes crues':{kcal:348,prot:14,carbs:67,lip:2.5},
    'Pâtes complètes cuites':{kcal:124,prot:5,carbs:25,lip:1},
    'Gnocchi':{kcal:160,prot:4,carbs:33,lip:1.5,fibres:1.9,sucres:9.9,satures:0.34,sel:2.21},
    'Polenta cuite':{kcal:85,prot:2,carbs:18,lip:0.4,fibres:1.6,sucres:0.1,satures:0.01,sel:0.01},
    'Quinoa cuit':{kcal:120,prot:4.4,carbs:21,lip:1.9,fibres:3.8,sucres:0.87,satures:0.14,sel:0.01},
    'Boulgour cuit':{kcal:112,prot:4,carbs:24,lip:0.3,fibres:2.2,sucres:0,satures:0.11,sel:0.02},
    'Épeautre cru':{kcal:338,prot:15,carbs:70,lip:2.4,fibres:10.7,sucres:6.68,satures:0.41,sel:0.02},
    'Sarrasin cru':{kcal:343,prot:13,carbs:72,lip:3.4,fibres:7,satures:0.74,sel:0},
    'Pain pita':{kcal:275,prot:9,carbs:55,lip:1.2,fibres:2.68,sucres:2.18,satures:0.17,sel:1.38},
    'Pain aux céréales':{kcal:258,prot:10,carbs:43,lip:4.5,fibres:5.2,sucres:2.2,satures:0.45,sel:1.13},
    'Baguette':{kcal:270,prot:9,carbs:55,lip:1.5},
    'Biscotte':{kcal:390,prot:12,carbs:75,lip:5,fibres:4.85,sucres:9.01,satures:6.17,sel:0.99},
    'Pomme de terre cuite':{kcal:87,prot:2,carbs:20,lip:0.1,fibres:1.8,sucres:0.86,satures:0.09,sel:0.05,cache:true},
    'Frites four':{kcal:180,prot:3,carbs:28,lip:6,fibres:4.2,sucres:0.29,satures:0.75,sel:0.39},
    'Patate douce cuite':{kcal:90,prot:2,carbs:21,lip:0.1,fibres:2.9,sucres:6.11,satures:0.04,sel:0.08,cache:true},
    // ===== AJOUTS LAITIERS =====
    'Yaourt nature':{kcal:61,prot:3.5,carbs:4.7,lip:3.3,fibres:0.14,sucres:3.9,satures:6.22,sel:0.1},
    'Yaourt 0%':{kcal:38,prot:6.2,carbs:3.6,lip:0.1,fibres:0,sucres:4.1,satures:0.04,sel:0.14},
    'Yaourt grec 0%':{kcal:57,prot:10,carbs:4,lip:0.4},
    'Fromage blanc 3%':{kcal:73,prot:7.5,carbs:4,lip:3,fibres:0,sucres:3.46,satures:2.12,sel:0.11},
    'Ricotta':{kcal:174,prot:11,carbs:3,lip:13,fibres:0,sucres:2.25,satures:8.08,sel:0.3},
    'Feta':{kcal:264,prot:14,carbs:4,lip:21,fibres:0,sucres:0,satures:16.8,sel:2.27},
    'Chèvre frais':{kcal:206,prot:18,carbs:2,lip:14},
    'Emmental':{kcal:382,prot:28,carbs:0,lip:30,fibres:0,sucres:0,satures:19.7,sel:0.61},
    'Cheddar':{kcal:403,prot:25,carbs:1.3,lip:33,fibres:0,sucres:0,satures:19.5,sel:1.61},
    'Gouda':{kcal:356,prot:25,carbs:2.2,lip:27,fibres:0,sucres:0.25,satures:20.3,sel:2},
    'Gouda jeune':{kcal:340,prot:24,carbs:0,lip:26},
    'Gouda vieux':{kcal:390,prot:28,carbs:0,lip:30},
    'Gruyère':{kcal:413,prot:30,carbs:0.4,lip:32,fibres:0,sucres:0,satures:19.8,sel:0.8},
    'Maasdam':{kcal:344,prot:25,carbs:0,lip:27},
    'Leerdammer':{kcal:350,prot:27,carbs:0,lip:26},
    'Brie':{kcal:334,prot:21,carbs:0.5,lip:28,fibres:0,sucres:0.2,satures:14.5,sel:2.02},
    'Raclette':{kcal:357,prot:23,carbs:0.6,lip:28,fibres:0,sucres:0,satures:18.5,sel:1.69},
    'Mimolette':{kcal:404,prot:26,carbs:0,lip:33,fibres:0,sucres:0,satures:17.4},
    'Babybel':{kcal:300,prot:22.5,carbs:0,lip:23},
    'Boursin ail et fines herbes':{kcal:405,prot:7,carbs:2,lip:41},
    'Roquefort':{kcal:369,prot:19,carbs:2,lip:31,fibres:0,sucres:0,satures:24.9,sel:3.22},
    'Bleu':{kcal:340,prot:20,carbs:1,lip:29,fibres:0,sucres:0,satures:20.2,sel:1.44},
    'Mascarpone':{kcal:435,prot:4.6,carbs:4.2,lip:44,fibres:0,sucres:4,satures:25.7,sel:0.08},
    'Cottage cheese':{kcal:98,prot:11,carbs:3.4,lip:4.3},
    'Halloumi':{kcal:321,prot:22,carbs:2,lip:25},
    'Chèvre bûche':{kcal:290,prot:20,carbs:1,lip:23},
    'Herve':{kcal:300,prot:19,carbs:0.5,lip:25},
    'Passendale':{kcal:330,prot:23,carbs:0.5,lip:26},
    'Gruyère':{kcal:413,prot:30,carbs:0,lip:32,fibres:0,sucres:0,satures:19.8,sel:0.8},
    'Babybel':{kcal:300,prot:23,carbs:0,lip:23},
    'Kéfir':{kcal:41,prot:3.3,carbs:4.5,lip:1,fibres:0,sucres:3.62,satures:2.33,sel:0.12},
    // ===== AJOUTS PROTÉINES VÉGÉTALES =====
    'Protéine végétale (TVP)':{kcal:330,prot:52,carbs:30,lip:1},
    'Steak de soja':{kcal:150,prot:16,carbs:6,lip:7},
    'Falafel':{kcal:333,prot:13,carbs:32,lip:18,fibres:7.7,sucres:1.4,satures:1.5,sel:1.6},
    'Houmous':{kcal:166,prot:8,carbs:14,lip:10,fibres:5.98,sucres:1.38,satures:2.48,sel:1.19},
    'Haricots blancs':{kcal:139,prot:9,carbs:25,lip:0.5,fibres:16.8,sucres:1.92,satures:0.22,sel:0.03},
    'Flageolets':{kcal:128,prot:8,carbs:22,lip:0.5},
    'Fèves':{kcal:110,prot:8,carbs:18,lip:0.6,fibres:25,sucres:5.7,satures:0.25,sel:0.03},
    'Pois cassés':{kcal:118,prot:8,carbs:21,lip:0.4,fibres:15.8,sucres:2.75,satures:0.23,sel:0.05},
    // ===== AJOUTS OLÉAGINEUX & LIPIDES =====
    'Cacahuètes':{kcal:567,prot:26,carbs:16,lip:49,fibres:8.6,sucres:5.9,satures:8.4,sel:0.02},
    'Noix de pécan':{kcal:691,prot:9,carbs:14,lip:72,fibres:8.33,sucres:3.64,satures:6.62,sel:0},
    'Noix du Brésil':{kcal:659,prot:14,carbs:12,lip:67,fibres:6.4,sucres:2.33,satures:16,sel:0.01},
    'Noix de macadamia':{kcal:718,prot:8,carbs:14,lip:76,fibres:8.6,sucres:4.24,satures:11.8,sel:0.01},
    'Purée de cacahuète':{kcal:588,prot:25,carbs:20,lip:50},
    'Purée de noisette':{kcal:628,prot:15,carbs:17,lip:61},
    'Tahini':{kcal:595,prot:17,carbs:21,lip:54},
    'Huile de tournesol':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:11.1,sel:0.03},
    'Huile de lin':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:9.19,sel:0},
    'Margarine':{kcal:720,prot:0.2,carbs:0.7,lip:80},
    'Crème fraîche 30%':{kcal:292,prot:2.4,carbs:3,lip:30},
    'Crème fraîche 15%':{kcal:160,prot:2.8,carbs:3.5,lip:15},
    'Olives':{kcal:145,prot:1,carbs:4,lip:14,fibres:4.38,sucres:0.01,satures:2.35,sel:3.03},
    // ===== AJOUTS FRUITS =====
    'Clémentine':{kcal:46,prot:0.9,carbs:11,lip:0.2,fibres:1.7,sucres:8.6,satures:0.01,sel:0.01},
    'Pamplemousse':{kcal:42,prot:0.8,carbs:11,lip:0.1,fibres:1,sel:0},
    'Cerises':{kcal:63,prot:1,carbs:16,lip:0.2,fibres:1.6,sucres:10,satures:0.01,sel:0.01},
    'Framboises':{kcal:52,prot:1.2,carbs:12,lip:0.7,fibres:4.3,sucres:5.4,satures:0.13,sel:0.01},
    'Cassis':{kcal:63,prot:1.4,carbs:15,lip:0.4,fibres:5.8,sucres:9.68,satures:0.14,sel:0.01},
    'Grenade':{kcal:83,prot:1.7,carbs:19,lip:1.2,fibres:2.3,sucres:13.3,satures:0.07,sel:0.01},
    'Figue fraîche':{kcal:74,prot:0.8,carbs:19,lip:0.3},
    'Figue séchée':{kcal:249,prot:3.3,carbs:64,lip:0.9},
    'Banane séchée':{kcal:346,prot:3.9,carbs:88,lip:1.8},
    'Compote sans sucre':{kcal:50,prot:0.4,carbs:12,lip:0.1,fibres:1.68,sucres:16.7,satures:0.03,sel:0},
    // ===== AJOUTS LÉGUMES =====
    'Aubergine':{kcal:25,prot:1,carbs:6,lip:0.2,fibres:2.7,sucres:2.39,satures:0.03,sel:0.01},
    'Salade verte':{kcal:15,prot:1.4,carbs:2.9,lip:0.2,fibres:1.3,sucres:0.83,satures:0.03,sel:0.05},
    'Roquette':{kcal:25,prot:2.6,carbs:3.7,lip:0.7,fibres:1.6,sucres:2.05,satures:0.09,sel:0.07},
    'Chou':{kcal:25,prot:1.3,carbs:6,lip:0.1,fibres:3.08,sucres:1.92,satures:0.05,sel:0.07},
    'Chou de Bruxelles':{kcal:43,prot:3.4,carbs:9,lip:0.3,fibres:3.95,sucres:2.2,satures:0.07,sel:0.04},
    'Navet':{kcal:28,prot:0.9,carbs:6,lip:0.1,fibres:2.2,sucres:2.9,satures:0.01,sel:0.07},
    'Céleri':{kcal:16,prot:0.7,carbs:3,lip:0.2,fibres:4.5,sucres:1.6,satures:0.01,sel:0.09},
    'Fenouil':{kcal:31,prot:1.2,carbs:7,lip:0.2,fibres:2.6,sucres:2.2,satures:0.01,sel:0.06},
    'Endive':{kcal:17,prot:1,carbs:3.4,lip:0.1,fibres:1.1,sucres:2.4,satures:0.01,sel:0.01},
    'Radis':{kcal:16,prot:0.7,carbs:3.4,lip:0.1,fibres:1.2,sucres:4.3,satures:0.01,sel:0.06},
    'Échalote':{kcal:72,prot:2.5,carbs:17,lip:0.1,fibres:2.6,sucres:3.3,satures:0.01,sel:0.01},
    'Oignon':{kcal:40,prot:1.1,carbs:9,lip:0.1,fibres:1.7,sucres:4.8,satures:0.2,sel:0.1},
    'Ail':{kcal:149,prot:6.4,carbs:33,lip:0.5,fibres:5.8,sucres:1.2,satures:0.01,sel:0.02},
    'Potiron':{kcal:26,prot:1,carbs:6,lip:0.1,fibres:0.5,sucres:1.36,satures:0.05,sel:0},
    'Poireau':{kcal:61,prot:1.5,carbs:14,lip:0.3,fibres:2.27,sucres:3.15,satures:0.05,sel:0.04},
    // ===== AJOUTS DIVERS / SUCRES =====
    'Sucre blanc':{kcal:400,prot:0,carbs:100,lip:0,fibres:0,sucres:99.8,satures:0,sel:0.01},
    'Sirop d\'agave':{kcal:310,prot:0,carbs:76,lip:0},
    'Sirop d\'érable':{kcal:260,prot:0,carbs:67,lip:0},
    'Chocolat noir 70%':{kcal:550,prot:8,carbs:46,lip:38,fibres:12,sucres:38.3,satures:22.5,sel:0.02},
    'Chocolat au lait':{kcal:535,prot:7,carbs:59,lip:30,fibres:2.3,sucres:44.5,satures:32.5,sel:0.25},
    'Cacao en poudre':{kcal:228,prot:20,carbs:58,lip:14,fibres:29.5,sucres:0.9,satures:12.4,sel:0.11},
    'Pâte à tartiner':{kcal:539,prot:6,carbs:57,lip:31,fibres:3.23,sucres:56.2,satures:9.18,sel:0.12},
    'Ketchup':{kcal:112,prot:1.2,carbs:26,lip:0.1,fibres:1.15,sucres:20.8,satures:0.07,sel:2.59},
    'Moutarde':{kcal:66,prot:4,carbs:5,lip:3.4,fibres:1,sucres:1.66,satures:0.76,sel:6.3},
    'Sauce soja':{kcal:53,prot:8,carbs:5,lip:0.1,fibres:0.86,sucres:1.32,satures:0.01,sel:18.6},
    'Blanc de poulet (cru)':{kcal:120,prot:23,carbs:0,lip:2.6},
    'Blanc de poulet (cuit)':{kcal:165,prot:31,carbs:0,lip:3.6},
    'Escalope de poulet (crue)':{kcal:120,prot:23,carbs:0,lip:2.6},
    'Escalope de poulet (cuite)':{kcal:165,prot:31,carbs:0,lip:3.6},
    'Filet de poulet (cru)':{kcal:120,prot:23,carbs:0,lip:2.6},
    'Filet de poulet (cuit)':{kcal:165,prot:31,carbs:0,lip:3.6},
    'Blanc de dinde (cru)':{kcal:104,prot:24,carbs:0,lip:1},
    'Blanc de dinde (cuit)':{kcal:135,prot:30,carbs:0,lip:1.5},
    'Escalope de dinde (crue)':{kcal:104,prot:24,carbs:0,lip:1},
    'Escalope de dinde (cuite)':{kcal:135,prot:30,carbs:0,lip:1.5},
    'Steak hache 5 pourcent':{kcal:137,prot:21,carbs:0,lip:5},
    'Steak hache 15 pourcent':{kcal:220,prot:19,carbs:0,lip:15},
    'Blanc d\'oeuf':{kcal:52,prot:11,carbs:0.7,lip:0.2},
    'Jaune d\'oeuf':{kcal:322,prot:16,carbs:3.6,lip:27},
    'Burger classique':{kcal:250,prot:13,carbs:21,lip:12},
    'Cheeseburger':{kcal:280,prot:15,carbs:22,lip:14,fibres:1.8,sucres:5.47,satures:5.07,sel:1.33},
    'Burger double':{kcal:295,prot:17,carbs:18,lip:17},
    'Frites':{kcal:312,prot:3.4,carbs:41,lip:15,fibres:3.9,sucres:0.69,satures:2.94,sel:0.07},
    'Pizza margherita':{kcal:266,prot:11,carbs:33,lip:10,fibres:1.67,sucres:2.72,satures:3.4,sel:1.24},
    'Pizza pepperoni':{kcal:298,prot:13,carbs:34,lip:12},
    'Kebab':{kcal:215,prot:13,carbs:18,lip:10},
    'Tacos francais':{kcal:280,prot:12,carbs:28,lip:14},
    'Nuggets de poulet':{kcal:296,prot:15,carbs:16,lip:19},
    'Tenders poulet':{kcal:263,prot:19,carbs:14,lip:14},
    'Hot-dog':{kcal:247,prot:10,carbs:20,lip:15,fibres:1.6,sucres:5.2,satures:5.18,sel:1.69},
    'Wrap poulet':{kcal:218,prot:13,carbs:22,lip:9},
    'Panini':{kcal:280,prot:12,carbs:30,lip:12},
    'Sandwich jambon-beurre':{kcal:250,prot:11,carbs:30,lip:9,fibres:3.17,sucres:2.34,satures:5.92,sel:1.69},
    'Croque-monsieur':{kcal:280,prot:14,carbs:23,lip:15,fibres:2.45,sucres:2.14,satures:6.5,sel:1.57},
    'Fish and chips':{kcal:290,prot:14,carbs:28,lip:14},
    'Onion rings':{kcal:332,prot:4.6,carbs:38,lip:18},
    'Chicken wings':{kcal:290,prot:27,carbs:0,lip:20},
    'Nems':{kcal:230,prot:8,carbs:25,lip:11},
    'Samoussa':{kcal:262,prot:6,carbs:28,lip:14},
    'Quiche lorraine':{kcal:300,prot:11,carbs:22,lip:19,fibres:1.29,sucres:2.67,satures:8.63,sel:1.28},
    'Sushi 6 pieces':{kcal:200,prot:9,carbs:35,lip:2},
    'Maki 6 pieces':{kcal:150,prot:5,carbs:28,lip:2},
    'Pates carbonara':{kcal:200,prot:8,carbs:25,lip:8,fibres:1.18,sucres:1.79,satures:4.34,sel:0.86},
    'Lasagnes':{kcal:175,prot:9,carbs:15,lip:9,fibres:1.91,sucres:2.84,satures:2.55,sel:0.97},
    'Burrito':{kcal:215,prot:9,carbs:27,lip:8,fibres:1.9,sucres:1.9,satures:4.33,sel:0.75},
    'Nachos fromage':{kcal:330,prot:8,carbs:36,lip:17},
    'Donut':{kcal:435,prot:5,carbs:51,lip:23},
    'Cookie':{kcal:480,prot:5,carbs:64,lip:23,fibres:3.38,sucres:31.5,satures:12.9,sel:1.01},
    'Muffin':{kcal:385,prot:6,carbs:54,lip:16,fibres:1.55,sucres:27.9,satures:4.13,sel:0.9},
    'Pain au chocolat':{kcal:414,prot:7,carbs:45,lip:23,fibres:3,sucres:11.1,satures:13.4,sel:1.1},
    'Croissant':{kcal:406,prot:8,carbs:42,lip:23,fibres:1.53,sucres:2.6,satures:8.5,sel:1.1},
    'Glace 2 boules':{kcal:207,prot:3.5,carbs:24,lip:11},
    'Milkshake':{kcal:112,prot:3.5,carbs:18,lip:3},
    'Soda canette':{kcal:42,prot:0,carbs:11,lip:0},
    // ===== SAUCES & CONDIMENTS =====
    'Sauce tomate':{kcal:18,prot:0.9,carbs:3.9,lip:0.2,fibres:2.41,sucres:4.6,satures:3.83,sel:1.31},
    'Sauce bolognaise':{kcal:60,prot:3,carbs:8,lip:1.5,fibres:2.46,sucres:5.05,satures:0.48,sel:0.77},
    'Sauce béchamel':{kcal:95,prot:2.5,carbs:5,lip:7,fibres:0.2,sucres:4.38,satures:2.85,sel:0.89},
    'Sauce carbonara':{kcal:120,prot:3,carbs:2,lip:10,fibres:2.65,sucres:1,satures:8.25,sel:1.49},
    'Sauce alfredo':{kcal:140,prot:2,carbs:3,lip:13},
    'Sauce pesto':{kcal:275,prot:8,carbs:5,lip:27,fibres:2.5,sucres:3.2,satures:4.39,sel:2.64},
    'Sauce barbecue':{kcal:110,prot:0.5,carbs:26,lip:0.2,fibres:1.2,sucres:27.5,satures:0.1,sel:1.77},
    'Sauce sriracha':{kcal:80,prot:2,carbs:16,lip:0.2},
    'Sauce wasabi':{kcal:140,prot:8,carbs:20,lip:3},
    'Sauce teriyaki':{kcal:72,prot:4.5,carbs:14,lip:0,fibres:0.1,sucres:13.2,satures:0.3,sel:6.13},
    'Sauce curry':{kcal:120,prot:3,carbs:15,lip:4,fibres:1.28,sucres:5.83,satures:2.11,sel:1.12},
    'Sauce tamari':{kcal:61,prot:10,carbs:3,lip:0.5},
    'Sauce poisson':{kcal:35,prot:5.5,carbs:1,lip:0,fibres:0.2,sucres:8.34,satures:0,sel:22.2},
    'Sauce oyster':{kcal:80,prot:2,carbs:17,lip:0.1},
    'Sauce worcestershire':{kcal:70,prot:2,carbs:16,lip:0},
    'Sauce ranch':{kcal:150,prot:1,carbs:2,lip:15},
    'Sauce vinaigrette':{kcal:120,prot:0.2,carbs:2,lip:13,fibres:0.34,sucres:2.9,sel:2.57},
    'Sauce caesar':{kcal:160,prot:1.5,carbs:2,lip:17},
    'Sauce miel-moutarde':{kcal:140,prot:2,carbs:30,lip:1},
    'Sauce gribiche':{kcal:180,prot:2,carbs:3,lip:18},
    'Sauce béarnaise':{kcal:200,prot:1,carbs:2,lip:21,fibres:0.48,sucres:2.3,satures:3.55,sel:1.95},
    'Sauce hollandaise':{kcal:180,prot:1,carbs:1,lip:19,fibres:0.5,sucres:0.7,satures:7.23,sel:1.19},
    'Sauce tartare':{kcal:180,prot:1,carbs:2,lip:18,fibres:0.47,sucres:3.11,satures:4.99,sel:1.94},
    'Sauce cocktail':{kcal:150,prot:0.5,carbs:10,lip:12},
    'Sauce chili':{kcal:50,prot:1,carbs:11,lip:0.2},
    'Sauce harissa':{kcal:60,prot:1,carbs:10,lip:2},
    'Sauce aïoli':{kcal:200,prot:0.5,carbs:2,lip:21,fibres:0.42,sucres:3.14,sel:1.85},
    'Sauce tzatziki':{kcal:60,prot:4,carbs:3,lip:4},
    'Sauce samouraï':{kcal:120,prot:1,carbs:20,lip:4},
    'Sauce tomate cherry':{kcal:20,prot:1,carbs:4,lip:0.2},
    'Sauce armoricaine':{kcal:100,prot:2,carbs:8,lip:6,fibres:0,sucres:0.73,satures:6.3,sel:1.3},
    'Sauce normande':{kcal:110,prot:2,carbs:4,lip:10},
    'Sauce lyonnaise':{kcal:80,prot:1.5,carbs:12,lip:2},
    'Sauce mornay':{kcal:120,prot:3.5,carbs:6,lip:9},
    'Sauce suprême':{kcal:130,prot:3,carbs:5,lip:11},
    'Sauce espagnole':{kcal:70,prot:2,carbs:8,lip:3},
    'Sauce demi-glace':{kcal:90,prot:3.5,carbs:10,lip:3},
    'Sauce robert':{kcal:75,prot:1,carbs:12,lip:2},
    'Sauce poivrade':{kcal:85,prot:1,carbs:10,lip:4},
    'Sauce zingara':{kcal:95,prot:1.5,carbs:12,lip:4},
    'Sauce financière':{kcal:110,prot:3,carbs:8,lip:7},
    'Sauce velouté':{kcal:100,prot:2.5,carbs:6,lip:7},
    'Sauce grand veneur':{kcal:120,prot:2,carbs:10,lip:8,fibres:0,sucres:6.6,satures:4.85,sel:1.14},
    'Sauce poivron':{kcal:65,prot:1,carbs:10,lip:2,fibres:2.09,sucres:4.46,satures:0.49,sel:1.13},
    // ===== CONDIMENTS DIVERS =====
    'Vinaigre blanc':{kcal:18,prot:0,carbs:0.4,lip:0},
    'Vinaigre balsamique':{kcal:88,prot:0.5,carbs:17,lip:0,fibres:0.5,sucres:19.1,satures:0,sel:0.07},
    'Vinaigre de riz':{kcal:18,prot:0,carbs:0,lip:0},
    'Mayonnaise':{kcal:680,prot:1,carbs:1,lip:75,fibres:0.32,sucres:1.03,satures:7.27,sel:1.39},
    'Mayonnaise light':{kcal:360,prot:1,carbs:2,lip:38},
    'Miel':{kcal:304,prot:0.3,carbs:82,lip:0,fibres:0,sucres:79.8,satures:0,sel:0.01},
    'Miel de manuka':{kcal:304,prot:0.4,carbs:81,lip:0},
    'Sirop d\'érable':{kcal:260,prot:0,carbs:67,lip:0},
    'Sirop d\'agave':{kcal:310,prot:0,carbs:76,lip:0},
    'Sirop de maïs':{kcal:280,prot:0,carbs:76,lip:0},
    'Mélasse':{kcal:290,prot:0,carbs:75,lip:0,fibres:0,sucres:74.7,satures:0.02,sel:0.09},
    'Relish':{kcal:100,prot:0.5,carbs:24,lip:0.2},
    'Cornichons':{kcal:12,prot:0.7,carbs:2.2,lip:0.1,fibres:1.5,sucres:0.6,satures:0.01,sel:1.72},
    'Câpres':{kcal:23,prot:2.4,carbs:2.2,lip:0.3,fibres:3.6,sucres:0.41,satures:0.23,sel:4.06},
    'Anchois en boîte':{kcal:210,prot:30,carbs:0,lip:11},
    'Sauce worcester':{kcal:70,prot:2,carbs:16,lip:0},
    'Tabasco':{kcal:24,prot:0.4,carbs:5,lip:0},
    'Sauce sriracha épicée':{kcal:80,prot:2,carbs:16,lip:0.2},
    // ===== POISSONS & FRUITS DE MER SUPPLÉMENTAIRES =====
    'Huître':{kcal:68,prot:7,carbs:4,lip:2,fibres:0,sucres:0,satures:0.17,sel:1.28},
    'Écrevisse':{kcal:91,prot:20,carbs:0,lip:0.5,fibres:0,sucres:0,satures:0.11,sel:0.39},
    'Poulpe':{kcal:82,prot:15,carbs:3,lip:1,fibres:0,sucres:0,satures:0.16,sel:0.68},
    'Seiche':{kcal:84,prot:16,carbs:1.2,lip:1.1,fibres:0,sucres:0,satures:0.35,sel:0.93},
    'Lieu jaune':{kcal:82,prot:18,carbs:0,lip:0.9,fibres:0,sucres:0,satures:0.07,sel:0.29},
    'Turbot':{kcal:110,prot:21,carbs:0,lip:2,fibres:0,sucres:0,satures:0.19,sel:0.23},
    'Rouget':{kcal:124,prot:21,carbs:0,lip:4,fibres:0,sucres:0,satures:2.72,sel:0.17},
    'Daurade royale':{kcal:127,prot:23,carbs:0,lip:4},
    'Turlutte':{kcal:85,prot:15,carbs:3,lip:1.2},
    'Espadon':{kcal:144,prot:22,carbs:0,lip:6,fibres:0,sucres:0,sel:0.28},
    'Thon rouge':{kcal:180,prot:25,carbs:0,lip:8,fibres:0,sucres:0,satures:1.26,sel:0.1},
    'Requin':{kcal:130,prot:21,carbs:0,lip:4.5,fibres:0,sucres:0,satures:0.48,sel:0.2},
    'Eperlan':{kcal:95,prot:17,carbs:0,lip:2.7,fibres:0,sucres:0,satures:0.27,sel:0.39},
    'Carpe':{kcal:127,prot:19,carbs:0,lip:5.5,fibres:0,sucres:0,satures:1.28,sel:0.08},
    'Perche':{kcal:82,prot:18,carbs:0,lip:0.5,fibres:0,sucres:0,satures:0.28,sel:0.14},
    'Truite arc-en-ciel':{kcal:120,prot:20,carbs:0,lip:4,fibres:0,sucres:0,satures:1.15,sel:0.11},
    'Truite fumée':{kcal:135,prot:22,carbs:0,lip:5,fibres:0,sucres:0,satures:1.71,sel:3.18},
    // ===== VIANDES SUPPLÉMENTAIRES =====
    'Bacon':{kcal:541,prot:37,carbs:0,lip:43},
    'Pancetta':{kcal:380,prot:15,carbs:0,lip:35,fibres:0,sucres:0.43,satures:12.5,sel:4.14},
    'Speck':{kcal:328,prot:28,carbs:0,lip:24},
    'Prosciutto':{kcal:340,prot:26,carbs:0,lip:27},
    'Jambon de Parme':{kcal:254,prot:30,carbs:0,lip:14,fibres:0,sucres:0.3,satures:5.42,sel:5.53},
    'Jambon de Bayonne':{kcal:308,prot:35,carbs:0,lip:18,fibres:0,sucres:0.5,satures:4.93,sel:5.75},
    'Salami':{kcal:465,prot:26,carbs:0,lip:39,fibres:0,sucres:0.2,satures:16.2,sel:4.05},
    'Saucisson':{kcal:580,prot:20,carbs:0,lip:55,fibres:0.73,sucres:1.2,satures:11.3,sel:4.75},
    'Pâté foie gras':{kcal:461,prot:6,carbs:1,lip:47},
    'Pâté maison':{kcal:420,prot:12,carbs:0,lip:40},
    'Terrine':{kcal:280,prot:18,carbs:0,lip:24,fibres:1,sucres:0.95,satures:7.9,sel:1.84},
    'Rôti de bœuf':{kcal:210,prot:28,carbs:0,lip:10},
    'Côte de boeuf':{kcal:280,prot:26,carbs:0,lip:19},
    'Entrecôte':{kcal:250,prot:27,carbs:0,lip:15,cache:true},
    'Côtes levées':{kcal:293,prot:25,carbs:0,lip:22},
    'Boeuf bourguignon':{kcal:180,prot:20,carbs:5,lip:8,fibres:1.25,sucres:1.57,satures:0.88,sel:0.88},
    'Boulettes viande':{kcal:220,prot:18,carbs:6,lip:14},
    'Escalope veau':{kcal:172,prot:31,carbs:0,lip:5},
    'Côte veau':{kcal:182,prot:29,carbs:0,lip:7},
    'Pied de veau':{kcal:180,prot:27,carbs:0,lip:8},
    'Foie veau':{kcal:130,prot:18,carbs:3.2,lip:4,fibres:0,sucres:0,satures:1.31,sel:0.16},
    'Rognons':{kcal:100,prot:16,carbs:0,lip:3.6,fibres:0,satures:1.02,sel:0.35},
    'Tripes':{kcal:110,prot:18,carbs:0,lip:3.5,fibres:0,sucres:0,satures:1.29,sel:0.24},
    'Andouille':{kcal:280,prot:18,carbs:1,lip:22,fibres:0,sel:2.08},
    'Andouillette':{kcal:320,prot:20,carbs:2,lip:26,fibres:0.71,sucres:0.5,satures:6.94,sel:1.46},
    'Boudin noir':{kcal:405,prot:13,carbs:16,lip:32,fibres:1.42,sucres:1.12,satures:9.57,sel:1.29},
    'Boudin blanc':{kcal:280,prot:15,carbs:3,lip:23,sucres:3.64,satures:7.89,sel:1.42},
    'Confit de canard':{kcal:412,prot:14,carbs:0,lip:40,fibres:0.4,sucres:0.14,satures:7.26,sel:1.44},
    'Magret de canard':{kcal:230,prot:28,carbs:0,lip:13,cache:true},
    'Cuisse de canard':{kcal:260,prot:25,carbs:0,lip:17},
    'Oie':{kcal:238,prot:27,carbs:0,lip:14,fibres:0,satures:2.79,sel:0.2},
    'Foie gras mi-cuit':{kcal:461,prot:6,carbs:1,lip:47},
    'Poularde':{kcal:180,prot:28,carbs:0,lip:8},
    'Chapon':{kcal:200,prot:27,carbs:0,lip:11,fibres:0,sucres:0,satures:1.5,sel:0.56},
    'Pintade':{kcal:170,prot:29,carbs:0,lip:6,fibres:0,sucres:0,satures:1.55,sel:0.18},
    'Caille':{kcal:190,prot:27,carbs:0,lip:10,fibres:0,sucres:0.5,satures:1.21,sel:0.12},
    'Faisan':{kcal:220,prot:29,carbs:0,lip:11,fibres:0,sucres:0,satures:1.29,sel:0.09},
    'Chevreuil':{kcal:120,prot:23,carbs:0,lip:2.5,fibres:0,sucres:0,satures:1,sel:0.05},
    'Sanglier':{kcal:130,prot:22,carbs:0,lip:4.5,fibres:0,sucres:0,satures:2.47,sel:0.2},
    'Lapin':{kcal:135,prot:22,carbs:0,lip:5,fibres:0,sucres:0,satures:4.74,sel:0.14},
    'Lièvre':{kcal:150,prot:24,carbs:0,lip:5.5,fibres:0,sucres:0,satures:0.93,sel:0.15},
    'Escargot':{kcal:90,prot:16,carbs:2,lip:1.5,fibres:0,sucres:0,satures:0.19,sel:0.35},
    'Tripe à la mode':{kcal:140,prot:16,carbs:4,lip:6,fibres:0,sucres:0,satures:1.29,sel:1.06},
    'Langue de boeuf':{kcal:280,prot:25,carbs:0,lip:20,fibres:0,sucres:0.2,satures:4.69,sel:0.17},
    'Queue de boeuf':{kcal:250,prot:26,carbs:0,lip:16},
    // ===== FROMAGES SUPPLÉMENTAIRES =====
    'Camembert':{kcal:300,prot:20,carbs:0,lip:24,fibres:0,sucres:0.2,satures:14.1,sel:1.45},
    'Brie':{kcal:290,prot:18,carbs:0.5,lip:24,fibres:0,sucres:0.2,satures:14.5,sel:2.02},
    'Roquefort':{kcal:370,prot:22,carbs:2,lip:30,fibres:0,sucres:0,satures:24.9,sel:3.22},
    'Gorgonzola':{kcal:360,prot:19,carbs:3,lip:29,fibres:0,sucres:0.3,satures:16.9,sel:1.77},
    'Bleu d\'Auvergne':{kcal:370,prot:23,carbs:1,lip:29},
    'Comté 24 mois':{kcal:420,prot:29,carbs:0,lip:34},
    'Beaufort':{kcal:410,prot:28,carbs:0,lip:33,fibres:0,sucres:0,satures:19.2,sel:1.27},
    'Reblochon':{kcal:370,prot:18,carbs:0,lip:32,fibres:0,sucres:0,satures:18.8,sel:1.27},
    'Époisses':{kcal:350,prot:22,carbs:1,lip:28,fibres:0,sucres:0.03,satures:17.1,sel:1.76},
    'Livarot':{kcal:360,prot:21,carbs:0,lip:29,fibres:0,sucres:0.2,satures:15.3,sel:1.5},
    'Munster':{kcal:370,prot:20,carbs:0,lip:30,fibres:0,sucres:0,satures:18.8,sel:1.78},
    'Taleggio':{kcal:290,prot:19,carbs:0.5,lip:24},
    'Teleme':{kcal:280,prot:18,carbs:1,lip:23},
    'Boursin nature':{kcal:380,prot:8,carbs:1,lip:38},
    'Vache qui rit':{kcal:320,prot:19,carbs:2,lip:26},
    'Kiri':{kcal:290,prot:17,carbs:2,lip:24},
    'Laughing cow':{kcal:280,prot:14,carbs:4,lip:23},
    'Caprice des dieux':{kcal:320,prot:15,carbs:1,lip:28},
    'Saint Agur':{kcal:380,prot:19,carbs:0,lip:31},
    'Pont l\'évêque':{kcal:340,prot:19,carbs:0.5,lip:28},
    'Chaource':{kcal:280,prot:18,carbs:2,lip:23,fibres:0,sucres:0.2,satures:15.8,sel:1.9},
    'Valençay':{kcal:300,prot:19,carbs:0.5,lip:25,fibres:0,satures:18,sel:1.32},
    'Pouligny saint-pierre':{kcal:310,prot:21,carbs:0.5,lip:25,fibres:0,satures:16.8,sel:1.08},
    'Banon':{kcal:330,prot:22,carbs:0.5,lip:27},
    'Picodon':{kcal:320,prot:23,carbs:0,lip:26,fibres:0,sucres:0.5,satures:19.2,sel:1.25},
    'Maroilles':{kcal:360,prot:20,carbs:0,lip:29,fibres:0,satures:17.3,sel:2.07},
    // ===== LAITIERS SUPPLÉMENTAIRES =====
    'Lait entier':{kcal:61,prot:3.2,carbs:4.8,lip:3.3,fibres:0,sucres:4.2,satures:2.4,sel:0.11},
    'Lait de brebis':{kcal:95,prot:5.4,carbs:4.8,lip:6,fibres:0,sucres:4.5,satures:4.8,sel:0.11},
    'Lait de chèvre':{kcal:72,prot:3.6,carbs:4.3,lip:4.5,fibres:0,sucres:4.35,satures:1.8,sel:0.13},
    'Lait concentré sucré':{kcal:330,prot:8,carbs:55,lip:8.5,fibres:0,sucres:55.6,satures:5.17,sel:0.21},
    'Lait concentré non sucré':{kcal:100,prot:7,carbs:4,lip:8,fibres:3,sucres:9.47,satures:3.96,sel:0.24},
    'Poudre lait entier':{kcal:496,prot:26,carbs:38,lip:26},
    'Crème fraîche 40%':{kcal:408,prot:2,carbs:3,lip:40},
    'Mascarpone':{kcal:450,prot:4,carbs:6,lip:47,fibres:0,sucres:4,satures:25.7,sel:0.08},
    'Crème aigre':{kcal:340,prot:3,carbs:3,lip:34},
    'Crème pâtissière':{kcal:140,prot:2.5,carbs:16,lip:6,fibres:0,sucres:15.3,satures:1.76,sel:0.2},
    'Fromage blanc 20%':{kcal:150,prot:8,carbs:5,lip:11},
    'Fromage blanc 40%':{kcal:200,prot:6,carbs:3,lip:18},
    'Fromage frais à tartiner (type Philadelphia)':{kcal:253,prot:6,carbs:4,lip:23},
    'Fromage frais à tartiner allégé':{kcal:160,prot:7,carbs:5,lip:12},
    'Yaourt à boire':{kcal:70,prot:3,carbs:11,lip:1},
    'Yaourt nature sucré':{kcal:85,prot:3,carbs:15,lip:1.5,fibres:0,sucres:12.6,satures:5.4,sel:0.18},
    'Yaourt saveur fruit':{kcal:100,prot:3,carbs:17,lip:2},
    'Yaourt bifidobactéries':{kcal:75,prot:3,carbs:12,lip:1},
    'Kéfir nature':{kcal:41,prot:3.3,carbs:4.5,lip:1,fibres:0,sucres:3.62,satures:2.33,sel:0.12},
    'Bifidus':{kcal:60,prot:4,carbs:9,lip:0.5},
    'Fromage blanc vanille':{kcal:100,prot:6,carbs:14,lip:1.5},
    // ===== LÉGUMES FEUILLES & SALADES =====
    'Laitue':{kcal:15,prot:1.2,carbs:2.9,lip:0.2,fibres:1.2,sucres:0.73,satures:0.02,sel:0.02},
    'Laitue iceberg':{kcal:14,prot:0.9,carbs:2.6,lip:0.1,fibres:1.15,sucres:1.48,satures:0.02,sel:0.02},
    'Laitue frisée':{kcal:17,prot:1.3,carbs:3.4,lip:0.2},
    'Laitue romaine':{kcal:17,prot:1.2,carbs:3.2,lip:0.3,fibres:2.1,sucres:1.19,satures:0.04,sel:0.02},
    'Mâche':{kcal:20,prot:1.8,carbs:3.3,lip:0.4,fibres:2.3,sucres:0,satures:0.01,sel:0.01},
    'Roquette':{kcal:25,prot:2.6,carbs:3.7,lip:0.7,fibres:1.6,sucres:2.05,satures:0.09,sel:0.07},
    'Épinards frais':{kcal:23,prot:2.9,carbs:3.6,lip:0.4},
    'Épinards cuits':{kcal:21,prot:2.7,carbs:3.4,lip:0.3,fibres:2.7,sucres:0.47,satures:0.04,sel:0.07},
    'Endives crues':{kcal:17,prot:1,carbs:3.4,lip:0.1,fibres:1.1,sucres:2.4,satures:0.01,sel:0.01},
    'Cresson':{kcal:22,prot:2.3,carbs:3.7,lip:0.1,fibres:1.35,sucres:2.2,satures:0.05,sel:0.1},
    'Pourpier':{kcal:20,prot:1.3,carbs:3.4,lip:0.2},
    'Pissenlit':{kcal:45,prot:2.7,carbs:9.2,lip:0.7,fibres:2.7,sucres:0.71,satures:0.17,sel:0.22},
    'Bette':{kcal:19,prot:1.8,carbs:3.7,lip:0.2,fibres:1.8,sucres:1.2,satures:0.01,sel:0.57},
    'Chou kale':{kcal:49,prot:4.3,carbs:9,lip:0.9},
    'Feuille de chou':{kcal:25,prot:1.3,carbs:6,lip:0.1},
    // ===== LÉGUMES RACINES & TUBERCULES =====
    'Navet blanc':{kcal:28,prot:0.9,carbs:6,lip:0.1},
    'Navet jaune':{kcal:30,prot:1,carbs:6.5,lip:0.1},
    'Rutabaga':{kcal:36,prot:1.2,carbs:8,lip:0.1,fibres:2.6,sucres:4.46,satures:0.02,sel:0.03},
    'Salsifis':{kcal:82,prot:3.5,carbs:18,lip:0.3,fibres:3.1,sucres:2.9,satures:0.04,sel:0.04},
    'Scorsonère':{kcal:82,prot:3.5,carbs:18,lip:0.3},
    'Topinambour':{kcal:76,prot:2,carbs:17,lip:0.1,fibres:2.1,sucres:9.6,satures:0.11,sel:0.01},
    'Radis blanc':{kcal:16,prot:0.6,carbs:3.4,lip:0.1},
    'Radis noir':{kcal:18,prot:0.8,carbs:3.6,lip:0.2,fibres:1.2,sucres:4.3,satures:0.01,sel:0.06},
    'Rave':{kcal:24,prot:1.1,carbs:5.3,lip:0.1},
    'Celeriac':{kcal:42,prot:1.5,carbs:9,lip:0.3},
    'Rondelle':{kcal:35,prot:1.2,carbs:7.5,lip:0.2},
    // ===== FRUITS SECS & NOIX SUPPLÉMENTAIRES =====
    'Amandes grillées':{kcal:650,prot:23,carbs:18,lip:57,fibres:10.9,sucres:4.86,satures:4.09,sel:1.25},
    'Cacahuètes grillées':{kcal:600,prot:27,carbs:14,lip:51,fibres:8.04,sucres:4.22,satures:8.64,sel:1.33},
    'Noix grillées':{kcal:700,prot:16,carbs:12,lip:69,fibres:3.85,sucres:8.01,satures:10.5,sel:1.15},
    'Noix de cajou grillées':{kcal:570,prot:19,carbs:28,lip:46,fibres:3.85,sucres:8.01,satures:10.5,sel:1.15},
    'Noix de macadamia grillées':{kcal:740,prot:9,carbs:12,lip:77,fibres:9.5,sucres:4.4,satures:11,sel:0.9},
    'Noix de pécan grillées':{kcal:710,prot:10,carbs:12,lip:72},
    'Pistaches grillées salées':{kcal:590,prot:21,carbs:26,lip:48,fibres:9.32,sucres:7.57,satures:6.58,sel:1.67},
    'Noix du Brésil grillées':{kcal:680,prot:15,carbs:11,lip:68},
    'Graine de sésame':{kcal:563,prot:17,carbs:24,lip:49},
    'Graine de pavot':{kcal:534,prot:18,carbs:28,lip:42},
    'Graine de moutarde':{kcal:508,prot:26,carbs:28,lip:36},
    'Graine de nigelle':{kcal:375,prot:19,carbs:35,lip:20},
    'Amande blanchie':{kcal:579,prot:21,carbs:19,lip:50,fibres:9.9,sucres:4.63,satures:3.95,sel:0.05},
    'Amande effilée':{kcal:595,prot:21,carbs:19,lip:52},
    'Noisette grillée':{kcal:650,prot:15,carbs:14,lip:63,fibres:9.4,sucres:4.26,satures:4.51},
    'Pignon de pin':{kcal:673,prot:14,carbs:13,lip:69,fibres:10,sucres:5.21,satures:5.53,sel:0.02},
    // ===== FRUITS EXOTIQUES & RARES =====
    'Goyave':{kcal:68,prot:2.6,carbs:14,lip:0.6,fibres:5.15,sucres:8.92,satures:0.21,sel:0.01},
    'Papaye':{kcal:43,prot:0.6,carbs:11,lip:0.3,fibres:1.8,sucres:8.1,satures:0.01,sel:0.01},
    'Kaki':{kcal:71,prot:0.6,carbs:19,lip:0.2,fibres:3.4,sucres:13.9,satures:0.01,sel:0.01},
    'Litchi':{kcal:66,prot:0.8,carbs:17,lip:0.3,fibres:2,sucres:15.7,satures:0.01,sel:0.01},
    'Fruit de la passion':{kcal:97,prot:2.2,carbs:24,lip:0.4,fibres:6.8,sucres:8.5,satures:0.54,sel:0.01},
    'Noix de coco fraîche':{kcal:354,prot:3.3,carbs:9,lip:35,fibres:9,sucres:6.22,satures:29.7,sel:0.05},
    'Coco sec':{kcal:660,prot:6,carbs:24,lip:64},
    'Lait de coco':{kcal:230,prot:2,carbs:6,lip:24,fibres:0.57,sucres:2.1,satures:16.5,sel:0.07},
    'Crème de coco':{kcal:330,prot:1.5,carbs:5,lip:35},
    'Figue de Barbarie':{kcal:44,prot:0.7,carbs:10,lip:0.5,fibres:4.45,sucres:1.02,satures:0.01,sel:0.01},
    'Fruit de dragon rouge':{kcal:60,prot:1.2,carbs:13,lip:0.4},
    'Fruit de dragon blanc':{kcal:60,prot:1.2,carbs:13,lip:0.4},
    'Cherimoya':{kcal:75,prot:1.6,carbs:17,lip:0.7},
    'Sapotille':{kcal:83,prot:0.4,carbs:20,lip:0.3},
    'Longane':{kcal:60,prot:1.3,carbs:15,lip:0.1},
    'Ramboustan':{kcal:82,prot:0.9,carbs:21,lip:0.2},
    'Durian':{kcal:147,prot:1.5,carbs:27,lip:5.3},
    'Mangoustan':{kcal:73,prot:0.4,carbs:17,lip:0.6},
    // ===== OLÉAGINEUX & HUILES SUPPLÉMENTAIRES =====
    'Huile d\'arachide':{kcal:900,prot:0,carbs:0,lip:100},
    'Huile de sésame':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:14.9,sel:0},
    'Huile de noix':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:10,sel:0},
    'Huile de noisette':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:8.34,sel:0},
    'Huile d\'avocat':{kcal:900,prot:0,carbs:0,lip:100},
    'Huile d\'onagre':{kcal:900,prot:0,carbs:0,lip:100},
    'Huile de bourrache':{kcal:900,prot:0,carbs:0,lip:100},
    'Huile de poisson':{kcal:900,prot:0,carbs:0,lip:100},
    'Ghee':{kcal:900,prot:0,carbs:0,lip:100},
    'Saindoux':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:41.1,sel:0.01},
    'Graisse de canard':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:33.2,sel:0},
    'Graisse d\'oie':{kcal:900,prot:0,carbs:0,lip:100},
    'Shortening':{kcal:900,prot:0,carbs:0,lip:100},
    'Spray de cuisine':{kcal:900,prot:0,carbs:0,lip:100},
    // ===== FÉCULENTS & LÉGUMINEUSES SUPPLÉMENTAIRES =====
    'Pois cassés jaunes':{kcal:118,prot:8,carbs:21,lip:0.4},
    'Pois cassés verts':{kcal:115,prot:9,carbs:20,lip:0.3},
    'Lentilles corail':{kcal:118,prot:9,carbs:20,lip:0.4,fibres:15.4,sucres:1.29,satures:0.14,sel:0.13},
    'Lentilles vertes':{kcal:123,prot:9,carbs:20,lip:0.5,fibres:16.4,sucres:1.1,satures:0.24,sel:0.13},
    'Lentilles beluga':{kcal:120,prot:9,carbs:21,lip:0.4},
    'Lentilles roses':{kcal:118,prot:9,carbs:20,lip:0.4},
    'Haricots blancs':{kcal:139,prot:9,carbs:25,lip:0.5,fibres:16.8,sucres:1.92,satures:0.22,sel:0.03},
    'Haricots noirs':{kcal:132,prot:8,carbs:24,lip:0.5},
    'Haricots pinto':{kcal:143,prot:9,carbs:27,lip:0.6},
    'Haricots rouges cuits':{kcal:127,prot:9,carbs:23,lip:0.5,fibres:11.6,sucres:0.5,satures:0.19,sel:0.02},
    'Pois chiches secs':{kcal:364,prot:19,carbs:61,lip:6},
    'Pois chiches cuits':{kcal:164,prot:9,carbs:27,lip:2.6,fibres:8.2,sucres:0.3,satures:0.46,sel:0.03},
    'Fèves sèches':{kcal:341,prot:26,carbs:58,lip:1.5,fibres:25,sucres:5.7,satures:0.25,sel:0.03},
    'Fèves cuites':{kcal:110,prot:8,carbs:18,lip:0.6,fibres:3.1,sucres:0.4,satures:0.16,sel:0.03},
    'Albizia':{kcal:150,prot:12,carbs:25,lip:0.5},
    'Mung':{kcal:105,prot:7,carbs:19,lip:0.3},
    'Azuki':{kcal:130,prot:8,carbs:25,lip:0.2},
    'Pois fourrager':{kcal:118,prot:8,carbs:21,lip:0.4},
    // ===== HERBES & ÉPICES =====
    'Basilic frais':{kcal:22,prot:2.7,carbs:2.7,lip:0.6,fibres:3.47,sucres:0.37,satures:0.13,sel:0.03},
    'Persil plat':{kcal:36,prot:2.7,carbs:6,lip:0.8},
    'Persil frisé':{kcal:36,prot:2.7,carbs:6,lip:0.8},
    'Coriandre fraîche':{kcal:23,prot:2.1,carbs:3.7,lip:0.5,fibres:2.8,sucres:0.87,satures:0.01,sel:0.12},
    'Menthe fraîche':{kcal:31,prot:3.8,carbs:6.5,lip:0.7,fibres:7.4,sucres:5.3,satures:0.22,sel:0.08},
    'Thym frais':{kcal:101,prot:5.6,carbs:24,lip:1.7,fibres:14,satures:0.47,sel:0.02},
    'Romarin frais':{kcal:131,prot:3.3,carbs:21,lip:3.3,fibres:14.1,satures:2.84,sel:0.07},
    'Sauge fraîche':{kcal:315,prot:10,carbs:61,lip:12,fibres:7,sucres:0.3,satures:0.01,sel:0.03},
    'Origan frais':{kcal:69,prot:3,carbs:14,lip:1},
    'Aneth frais':{kcal:43,prot:3.5,carbs:7,lip:0.8,fibres:3.5,sucres:1.2,satures:0.27,sel:0.15},
    'Estragon frais':{kcal:295,prot:22,carbs:51,lip:7,fibres:6.2,sucres:1.2,satures:0.6,sel:0.03},
    'Cerfeuil':{kcal:237,prot:8,carbs:49,lip:3,fibres:2.55,sucres:0.6,satures:0.22,sel:0.04},
    'Poivre blanc':{kcal:296,prot:10,carbs:64,lip:3,fibres:26.2,satures:0.63,sel:0.01},
    'Poivre noir':{kcal:251,prot:10,carbs:64,lip:3,fibres:25.7,sucres:0.64,satures:2.9,sel:0.04},
    'Poivre rouge':{kcal:319,prot:10,carbs:64,lip:3},
    'Paprika':{kcal:282,prot:14,carbs:54,lip:13,fibres:34.9,sucres:10.3,satures:2.14,sel:0.17},
    'Paprika fumée':{kcal:282,prot:14,carbs:54,lip:13},
    'Cumin':{kcal:375,prot:18,carbs:44,lip:22,fibres:10.5,sucres:2.25,satures:1.54,sel:0.42},
    'Coriandre graine':{kcal:298,prot:12,carbs:52,lip:12,fibres:41.9,satures:0.97,sel:0.09},
    'Cannelle':{kcal:247,prot:4,carbs:81,lip:3,fibres:53.1,sucres:2.17,satures:0.44,sel:0.03},
    'Muscade':{kcal:525,prot:6,carbs:49,lip:36},
    'Clou de girofle':{kcal:274,prot:6,carbs:41,lip:13,fibres:33.9,sucres:2.38,satures:3.95,sel:0.69},
    'Gingembre frais':{kcal:80,prot:1.8,carbs:18,lip:0.8},
    'Gingembre poudre':{kcal:335,prot:8.6,carbs:71,lip:4.2,fibres:14.1,sucres:3.39,satures:2.6,sel:0.07},
    'Curcuma':{kcal:312,prot:7.8,carbs:67,lip:3.3,fibres:22.7,sucres:3.21,satures:1.84,sel:0.07},
    'Fenouil graine':{kcal:345,prot:15.8,carbs:52,lip:15,fibres:39.8,sucres:12.5,satures:0.48,sel:0.22},
    'Cardamome':{kcal:311,prot:11,carbs:68,lip:7,fibres:28,sel:0.04},
    'Safran':{kcal:310,prot:11,carbs:65,lip:5,fibres:3.9,sucres:42.4,satures:1.59,sel:0.37},
    'Vanille':{kcal:288,prot:5.5,carbs:77,lip:0.1,sel:0},
    'Anis':{kcal:337,prot:17.6,carbs:50,lip:15.9},
    'Piment':{kcal:40,prot:2,carbs:9,lip:0.4,fibres:1.65,sucres:5.3,satures:0.03,sel:0.02},
    'Ail semoule':{kcal:331,prot:13,carbs:72,lip:1.7},
    'Oignon semoule':{kcal:341,prot:10,carbs:82,lip:0.5},
    'Poudre ail':{kcal:325,prot:17,carbs:71,lip:0.5},
    'Poudre oignon':{kcal:340,prot:11,carbs:83,lip:0.4},
    'Herbes provençales':{kcal:270,prot:9,carbs:54,lip:7},
    'Bouquet garni':{kcal:200,prot:8,carbs:40,lip:3},
    'Sel de table':{kcal:0,prot:0,carbs:0,lip:0},
    'Sel de mer':{kcal:0,prot:0,carbs:0,lip:0},
    'Sel himalayan':{kcal:0,prot:0,carbs:0,lip:0},
    // ===== BOISSONS CHAUDES & FROIDES =====
    'Café noir':{kcal:0,prot:0,carbs:0,lip:0},
    'Expresso':{kcal:1,prot:0.1,carbs:0,lip:0},
    'Café crème':{kcal:30,prot:0.5,carbs:1,lip:2,fibres:0,sucres:2.31,satures:0.47,sel:0.06},
    'Thé noir':{kcal:1,prot:0,carbs:0.3,lip:0,fibres:0,sucres:0,satures:0,sel:0.01},
    'Thé vert':{kcal:1,prot:0,carbs:0.3,lip:0,fibres:0,sel:0.01},
    'Thé blanc':{kcal:1,prot:0,carbs:0.3,lip:0},
    'Thé rooibos':{kcal:1,prot:0,carbs:0,lip:0},
    'Chocolat chaud maison':{kcal:150,prot:3,carbs:28,lip:4},
    'Chocolat chaud poudre':{kcal:140,prot:2,carbs:32,lip:1},
    'Cacao chaud':{kcal:120,prot:2.5,carbs:26,lip:0.5},
    'Café cappuccino':{kcal:40,prot:1.5,carbs:3,lip:2,fibres:3.3,sucres:52,satures:7.47,sel:0.79},
    'Café latte':{kcal:60,prot:2.5,carbs:4,lip:3},
    'Café macchiato':{kcal:20,prot:1,carbs:1,lip:1},
    'Smoothie banane':{kcal:120,prot:1.5,carbs:26,lip:1},
    'Smoothie berries':{kcal:100,prot:1,carbs:22,lip:0.5},
    'Jus orange frais':{kcal:47,prot:0.7,carbs:11,lip:0.3},
    'Jus pomme':{kcal:48,prot:0.1,carbs:12,lip:0.1,fibres:0.23,sucres:10.9,satures:0.05,sel:0.02},
    'Jus carotte':{kcal:41,prot:0.9,carbs:10,lip:0.2,fibres:0.33,sucres:5.95,satures:0.04,sel:0.1},
    'Nectar de pêche':{kcal:56,prot:0.3,carbs:14,lip:0,fibres:0.33,sucres:11.9,satures:0,sel:0.01},
    'Nectar d\'abricot':{kcal:60,prot:0.4,carbs:15,lip:0},
    'Sirop menthe':{kcal:235,prot:0,carbs:59,lip:0},
    'Sirop grenadine':{kcal:250,prot:0,carbs:62,lip:0},
    'Coca-cola':{kcal:42,prot:0,carbs:10.6,lip:0},
    'Fanta orange':{kcal:48,prot:0,carbs:12,lip:0},
    'Sprite':{kcal:42,prot:0,carbs:10.5,lip:0},
    'Eau gazeuse':{kcal:0,prot:0,carbs:0,lip:0,fibres:0,sucres:0,satures:0,sel:0.01},
    'Eau minérale':{kcal:0,prot:0,carbs:0,lip:0,fibres:0,sucres:0,satures:0,sel:0},
    'Eau de source':{kcal:0,prot:0,carbs:0,lip:0,fibres:0,sucres:0},
    'Eau pétillante':{kcal:0,prot:0,carbs:0,lip:0},
    'Vin blanc sec':{kcal:68,prot:0.1,carbs:0.6,lip:0,fibres:0,sucres:0.17,satures:0,sel:0.01},
    'Vin rouge léger':{kcal:70,prot:0.2,carbs:1,lip:0},
    'Vin rosé':{kcal:65,prot:0.2,carbs:2,lip:0,fibres:0,sel:0.01},
    'Champagne':{kcal:77,prot:0.3,carbs:2,lip:0,fibres:0,sucres:1.4,satures:0,sel:0},
    'Bière blonde':{kcal:40,prot:0.4,carbs:3,lip:0},
    'Bière brune':{kcal:45,prot:0.5,carbs:4,lip:0,fibres:0,sucres:4.1,satures:0,sel:0.03},
    'Cidre doux':{kcal:35,prot:0.1,carbs:4,lip:0,fibres:0,sucres:4.61,satures:0,sel:0.01},
    'Rhum blanc':{kcal:231,prot:0,carbs:0,lip:0},
    'Rhum brun':{kcal:231,prot:0,carbs:0,lip:0},
    'Vodka':{kcal:231,prot:0,carbs:0,lip:0,fibres:0,sucres:0,satures:0,sel:0},
    'Whisky':{kcal:237,prot:0,carbs:0,lip:0,fibres:0,sucres:0.1,satures:0,sel:0},
    'Cognac':{kcal:230,prot:0,carbs:0,lip:0},
    'Pastis':{kcal:180,prot:0,carbs:2,lip:0,fibres:0,sucres:0,satures:0,sel:0},
    'Liqueur':{kcal:250,prot:0,carbs:20,lip:0,fibres:0,sucres:35.3,satures:0.08,sel:0.02},
    // ===== AJOUTS - VIANDES (cru/cuit) =====
    'Aiguillette de poulet (crue)':{kcal:120,prot:23,carbs:0,lip:2.6},
    'Aiguillette de poulet (cuite)':{kcal:165,prot:31,carbs:0,lip:3.6},
    'Cuisse de poulet (crue)':{kcal:160,prot:19,carbs:0,lip:9},
    'Pilon de poulet (cru)':{kcal:160,prot:19,carbs:0,lip:9},
    'Pilon de poulet (cuit)':{kcal:209,prot:26,carbs:0,lip:11},
    'Magret de canard (cru)':{kcal:200,prot:19,carbs:0,lip:13},
    'Magret de canard (cuit)':{kcal:230,prot:27,carbs:0,lip:13},
    'Porc filet (cru)':{kcal:143,prot:21,carbs:0,lip:6,fibres:0,sucres:0,satures:1.69,sel:0.11},
    'Porc filet (cuit)':{kcal:175,prot:28,carbs:0,lip:7,fibres:0,satures:2.58,sel:0.13},
    'Côte de porc (crue)':{kcal:172,prot:20,carbs:0,lip:10},
    'Côte de porc (cuite)':{kcal:230,prot:27,carbs:0,lip:13},
    'Agneau (cru)':{kcal:230,prot:18,carbs:0,lip:17,fibres:0,sucres:0,satures:1.97,sel:0.12},
    'Agneau (cuit)':{kcal:290,prot:25,carbs:0,lip:21,fibres:0,sucres:0,satures:2.63,sel:0.19},
    'Veau escalope (crue)':{kcal:110,prot:21,carbs:0,lip:3,fibres:0,sucres:0,satures:0.6,sel:0.1},
    'Veau escalope (cuite)':{kcal:150,prot:28,carbs:0,lip:4,fibres:0,satures:0.82,sel:0.15},
    'Rôti de boeuf (cru)':{kcal:140,prot:22,carbs:0,lip:5},
    'Rôti de boeuf (cuit)':{kcal:190,prot:30,carbs:0,lip:7},
    'Entrecôte (crue)':{kcal:190,prot:20,carbs:0,lip:12},
    'Entrecôte (cuite)':{kcal:250,prot:27,carbs:0,lip:16},
    // ===== AJOUTS - POISSONS (cru/cuit) =====
    'Cabillaud (cuit)':{kcal:105,prot:23,carbs:0,lip:1,fibres:0,sucres:0,satures:0.16,sel:0.16},
    'Colin/Lieu (cru)':{kcal:78,prot:17,carbs:0,lip:1},
    'Colin/Lieu (cuit)':{kcal:100,prot:22,carbs:0,lip:1},
    'Dorade (crue)':{kcal:96,prot:20,carbs:0,lip:2,fibres:0,sucres:0},
    'Dorade (cuite)':{kcal:125,prot:26,carbs:0,lip:2.5,fibres:0,sucres:0,satures:1.3,sel:0.18},
    'Truite (crue)':{kcal:120,prot:20,carbs:0,lip:4,fibres:0,sucres:0,satures:0.62,sel:0.14},
    'Truite (cuite)':{kcal:150,prot:25,carbs:0,lip:5,fibres:0,sucres:0,satures:0.54},
    'Maquereau (cru)':{kcal:205,prot:19,carbs:0,lip:14,fibres:0,sucres:0,satures:3.22,sel:0.16},
    'Sardine (crue)':{kcal:165,prot:21,carbs:0,lip:9,fibres:0,sucres:0,satures:2.4,sel:0.22},
    'Sardine à l\'huile':{kcal:220,prot:24,carbs:0,lip:14,cache:true}, // doublon de « Sardines à l'huile »
    'Crevettes (cuites)':{kcal:99,prot:24,carbs:0,lip:0.3,fibres:0,sucres:0.25,satures:0.31,sel:1.35},
    'Moules (cuites)':{kcal:86,prot:12,carbs:4,lip:2,fibres:0,satures:0.37,sel:0.8},
    'Tilapia (cru)':{kcal:96,prot:20,carbs:0,lip:2,fibres:0,sucres:0,satures:0.56,sel:0.07},
    'Tilapia (cuit)':{kcal:128,prot:26,carbs:0,lip:3},
    // ===== AJOUTS - FÉCULENTS & LÉGUMINEUSES (cru/cuit) =====
    'Riz basmati (cuit)':{kcal:121,prot:3,carbs:25,lip:0.4,fibres:1,sucres:0,satures:0.3,sel:0.01},
    'Riz complet (cuit)':{kcal:111,prot:2.6,carbs:23,lip:0.9,fibres:2.3,sucres:0.2,satures:0.17,sel:0.01},
    'Quinoa (cuit)':{kcal:120,prot:4.4,carbs:21,lip:1.9,fibres:3.8,sucres:0.87,satures:0.14,sel:0.01},
    'Lentilles (cuites)':{kcal:116,prot:9,carbs:20,lip:0.4,fibres:7.9,sucres:1.8,satures:0.05,sel:0.01},
    'Pois chiches (cuits)':{kcal:164,prot:9,carbs:27,lip:2.6,fibres:8.2,sucres:0.3,satures:0.46,sel:0.03},
    'Haricots rouges (cuits)':{kcal:127,prot:9,carbs:23,lip:0.5,fibres:11.6,sucres:0.5,satures:0.19,sel:0.02},
    'Haricots blancs (cuits)':{kcal:139,prot:9,carbs:25,lip:0.6,fibres:13.8,sucres:0.3,satures:0.25,sel:0.02},
    'Boulgour (cuit)':{kcal:83,prot:3,carbs:19,lip:0.2,fibres:2.2,sucres:0,satures:0.11,sel:0.02},
    'Patate douce (crue)':{kcal:86,prot:1.6,carbs:20,lip:0.1,fibres:2.87,sucres:5.64,satures:0.06,sel:0.1},
    'Patate douce (cuite)':{kcal:90,prot:2,carbs:21,lip:0.1,fibres:2.9,sucres:6.11,satures:0.04,sel:0.08},
    'Pomme de terre (crue)':{kcal:77,prot:2,carbs:17,lip:0.1,fibres:1.3,sucres:0.2,satures:0.06,sel:0.06},
    'Pomme de terre (cuite)':{kcal:87,prot:2,carbs:20,lip:0.1,fibres:2.2,sucres:1.18,satures:0.04,sel:0.03},
    'Polenta (cuite)':{kcal:85,prot:2,carbs:18,lip:0.3,fibres:1.6,sucres:0.1,satures:0.01,sel:0.01},
    // ===== AJOUTS - PRODUITS LAITIERS & ŒUFS =====
    'Skyr nature':{kcal:63,prot:11,carbs:4,lip:0.2},
    'Fromage blanc 0%':{kcal:47,prot:8,carbs:4,lip:0.2,fibres:0,sucres:3.89,satures:0.03,sel:0.11},
    'Fromage blanc 3%':{kcal:74,prot:7,carbs:4,lip:3,fibres:0,sucres:3.46,satures:2.12,sel:0.11},
    'Yaourt grec':{kcal:97,prot:9,carbs:4,lip:5},
    'Cottage cheese':{kcal:98,prot:11,carbs:3,lip:4},
    'Mozzarella':{kcal:280,prot:22,carbs:2,lip:21,fibres:0,sucres:0.7,satures:11.7,sel:0.6},
    'Feta':{kcal:264,prot:14,carbs:4,lip:21,fibres:0,sucres:0,satures:16.8,sel:2.27},
    'Oeuf entier (cru)':{kcal:143,prot:13,carbs:0.7,lip:10},
    'Oeuf dur':{kcal:155,prot:13,carbs:1.1,lip:11,fibres:0,sucres:0.52,satures:2.55,sel:0.31},
    'Lait demi-écrémé':{kcal:46,prot:3.2,carbs:5,lip:1.6,fibres:0,sucres:4.66,satures:1.04,sel:0.09},
    'Lait d\'amande':{kcal:24,prot:0.5,carbs:3,lip:1.1},
    // ===== AJOUTS - FRUITS & LÉGUMES =====
    'Avocat':{kcal:160,prot:2,carbs:9,lip:15,fibres:3.6,sucres:0.4,satures:4.51,sel:0.01},
    'Myrtilles':{kcal:57,prot:0.7,carbs:14,lip:0.3,fibres:2.4,sucres:9.96,satures:0.03,sel:0},
    'Framboises':{kcal:52,prot:1.2,carbs:12,lip:0.7,fibres:4.3,sucres:5.4,satures:0.13,sel:0.01},
    'Mangue':{kcal:60,prot:0.8,carbs:15,lip:0.4,fibres:1.6,sucres:12.9,satures:0.01,sel:0.01},
    'Ananas':{kcal:50,prot:0.5,carbs:13,lip:0.1,fibres:1.2,sucres:10.5,satures:0.01,sel:0.01},
    'Kiwi':{kcal:61,prot:1.1,carbs:15,lip:0.5,fibres:2.4,sucres:8.9,satures:0.13,sel:0.01},
    'Épinards (crus)':{kcal:23,prot:2.9,carbs:3.6,lip:0.4},
    'Brocoli (cru)':{kcal:34,prot:2.8,carbs:7,lip:0.4,fibres:2.9,sucres:1.7,satures:0.06,sel:0.05},
    'Brocoli (cuit)':{kcal:35,prot:2.4,carbs:7,lip:0.4,fibres:1.5,sucres:1.1,satures:0.2,sel:0.1},
    'Courgette (crue)':{kcal:17,prot:1.2,carbs:3,lip:0.3,fibres:1.05,sucres:1.79,satures:0.06,sel:0.02},
    'Poivron':{kcal:31,prot:1,carbs:6,lip:0.3,fibres:3.2,sucres:3,satures:0.01,sel:0.01},
    'Champignons':{kcal:22,prot:3,carbs:3,lip:0.3,fibres:1.93,sucres:1.7,satures:0.07,sel:0.02},
    // ===== AJOUTS - SNACKS & DIVERS =====
    'Beurre de cacahuète':{kcal:588,prot:25,carbs:20,lip:50,fibres:5,sucres:10.5,satures:10.4,sel:0.97},
    'Amandes':{kcal:579,prot:21,carbs:22,lip:50,fibres:12.5,sucres:4.2,satures:4.11,sel:0.01},
    'Noix':{kcal:654,prot:15,carbs:14,lip:65,fibres:8.33,sucres:3.64,satures:6.62,sel:0},
    'Noix de cajou':{kcal:553,prot:18,carbs:30,lip:44,fibres:3.85,sucres:8.01,satures:10.5,sel:1.15},
    'Flocons d\'avoine':{kcal:389,prot:17,carbs:66,lip:7},
    'Galette de riz':{kcal:387,prot:8,carbs:82,lip:3,fibres:2.9,sucres:0.73,satures:0.54,sel:0.18},
    'Miel':{kcal:304,prot:0.3,carbs:82,lip:0,fibres:0,sucres:79.8,satures:0,sel:0.01},
    'Chocolat noir 70%':{kcal:598,prot:7.8,carbs:46,lip:43,fibres:12,sucres:38.3,satures:22.5,sel:0.02},
    'Whey (1 dose 30g)':{kcal:400,prot:80,carbs:10,lip:5,unit:30,unitLabel:'dose'},
    'Cookie de Véronique':{kcal:573.5,prot:7.48,carbs:52.86,lip:36.94,unit:147,unitLabel:'cookie'},

    // ===== ENRICHISSEMENT BASE (plats, Belgique, snacks, boissons...) =====
    'Grenaille':{kcal:85,prot:2,carbs:19,lip:0.1},
    'Pommes de terre grenaille':{kcal:85,prot:2,carbs:19,lip:0.1},
    'Purée de pommes de terre':{kcal:85,prot:2,carbs:15,lip:1.5},
    'Purée mousline (préparée)':{kcal:90,prot:2,carbs:15,lip:2},
    'Croquettes de pommes de terre':{kcal:220,prot:3.5,carbs:27,lip:11},
    'Croquettes de pdt':{kcal:220,prot:3.5,carbs:27,lip:11},
    'Pommes dauphines':{kcal:265,prot:5,carbs:24,lip:16,fibres:2.34,sucres:1.96,satures:3.98,sel:1.17},
    'Gratin dauphinois':{kcal:135,prot:3.5,carbs:13,lip:8,fibres:1.5,sucres:2.08,satures:2.67,sel:0.81},
    'Pommes de terre sautées':{kcal:150,prot:2.5,carbs:22,lip:6,fibres:2.89,sucres:1.59,satures:3.17,sel:0.67},
    'Pommes de terre rissolées':{kcal:165,prot:2.5,carbs:23,lip:7,fibres:4,sucres:0,satures:0.61,sel:0.19},
    'Wedges (quartiers épicés)':{kcal:200,prot:3,carbs:27,lip:9},
    'Röstis':{kcal:150,prot:2.5,carbs:20,lip:7,fibres:3.3,sucres:0.2,satures:1.06,sel:0.82},
    'Pommes duchesse':{kcal:180,prot:3,carbs:22,lip:9,fibres:2.13,sucres:0.73,satures:1.33,sel:0.93},
    'Pommes noisettes':{kcal:190,prot:2.5,carbs:24,lip:9,fibres:2.82,sucres:0.74,satures:1.68,sel:0.93},
    'Potatoes (country)':{kcal:180,prot:3,carbs:26,lip:7},
    'Frites de friterie':{kcal:290,prot:3.5,carbs:36,lip:14},
    'Purée de patate douce':{kcal:80,prot:1.4,carbs:17,lip:0.2},
    'Chips':{kcal:530,prot:6,carbs:50,lip:34,fibres:1,sucres:7.1,satures:2.4,sel:1.53},
    'Chips light':{kcal:470,prot:6,carbs:60,lip:21},
    'Popcorn nature':{kcal:390,prot:12,carbs:55,lip:13},
    'Popcorn sucré':{kcal:430,prot:7,carbs:70,lip:13},
    'Fricadelle':{kcal:280,prot:11,carbs:14,lip:20},
    'Boulets liégeois':{kcal:190,prot:12,carbs:8,lip:12},
    'Carbonnade flamande':{kcal:150,prot:14,carbs:6,lip:7},
    'Stoemp':{kcal:110,prot:3,carbs:15,lip:4},
    'Chicons au jambon (gratin)':{kcal:120,prot:8,carbs:6,lip:7},
    'Waterzooi de poulet':{kcal:95,prot:9,carbs:5,lip:4},
    'Vol-au-vent':{kcal:140,prot:10,carbs:8,lip:7},
    'Croquette de crevettes':{kcal:240,prot:9,carbs:18,lip:14},
    'Filet américain préparé':{kcal:220,prot:15,carbs:3,lip:16},
    'Gaufre de Liège':{kcal:400,prot:6,carbs:55,lip:17},
    'Gaufre de Bruxelles':{kcal:310,prot:7,carbs:40,lip:13},
    'Spéculoos':{kcal:480,prot:5,carbs:73,lip:18,fibres:1.93,sucres:32.6,satures:9.35,sel:0.86},
    'Pâte de spéculoos':{kcal:580,prot:4,carbs:58,lip:37},
    'Cervelas':{kcal:300,prot:12,carbs:2,lip:27,fibres:0.4,sucres:0.63,satures:9.37,sel:1.95},
    'Pistolet (petit pain)':{kcal:270,prot:9,carbs:52,lip:2},
    'Fromage de Herve':{kcal:300,prot:20,carbs:1,lip:24},
    'Sauce andalouse':{kcal:560,prot:1,carbs:10,lip:57},
    'Boudin de Liège':{kcal:320,prot:13,carbs:4,lip:28},
    'Riz jasmin cru':{kcal:350,prot:7,carbs:78,lip:0.6},
    'Riz jasmin cuit':{kcal:130,prot:2.7,carbs:28,lip:0.3},
    'Riz cantonais':{kcal:160,prot:6,carbs:22,lip:5,fibres:1.74,sucres:1.28,satures:0.75,sel:0.86},
    'Nouilles de riz':{kcal:360,prot:6,carbs:80,lip:0.6},
    'Nouilles chinoises':{kcal:350,prot:11,carbs:71,lip:2},
    'Nouilles ramen':{kcal:380,prot:10,carbs:73,lip:5},
    'Nouilles udon':{kcal:340,prot:9,carbs:70,lip:1},
    'Vermicelles de riz':{kcal:360,prot:6,carbs:80,lip:0.5,fibres:1.2,sucres:0,satures:0.3,sel:0.03},
    'Blé tendre cuit (Ebly)':{kcal:130,prot:4.5,carbs:25,lip:0.7},
    'Granola':{kcal:450,prot:10,carbs:60,lip:18},
    'Muesli croustillant':{kcal:440,prot:9,carbs:64,lip:15,fibres:3.4,satures:4.09,sel:0.06},
    'Riz soufflé':{kcal:380,prot:7,carbs:85,lip:1,fibres:1,sucres:8,satures:0.3,sel:1.15},
    'Céréales chocolat':{kcal:390,prot:7,carbs:75,lip:6,fibres:5.3,sucres:34.3,satures:3.03,sel:0.46},
    'Céréales miel':{kcal:380,prot:6,carbs:80,lip:3,fibres:3.36,sucres:17.2,satures:0.54,sel:1.25},
    'Porridge préparé':{kcal:90,prot:3,carbs:14,lip:2},
    'Pain de seigle':{kcal:240,prot:7,carbs:45,lip:1.5,fibres:4.5,sucres:2.4,satures:0.32,sel:1.35},
    'Pain intégral':{kcal:230,prot:9,carbs:42,lip:1.7,fibres:6.9,sucres:2.2,satures:0.52,sel:1.12},
    'Pain d\'épices':{kcal:330,prot:4,carbs:72,lip:3},
    'Bagel':{kcal:270,prot:10,carbs:50,lip:2,fibres:3.42,sucres:5.36,satures:1.02,sel:1.08},
    'Pain hamburger':{kcal:280,prot:8,carbs:50,lip:5,fibres:3.3,sucres:5.88,satures:0.88,sel:1.14},
    'Pain hot-dog':{kcal:290,prot:8,carbs:52,lip:5,fibres:3.3,sucres:5.88,satures:0.88,sel:1.14},
    'Chapelure':{kcal:380,prot:11,carbs:75,lip:3,fibres:4.5,sucres:6.9,satures:0.94,sel:1.82},
    'Chapelure panko':{kcal:370,prot:11,carbs:72,lip:2.5},
    'Farine de blé':{kcal:350,prot:10,carbs:72,lip:1.2,fibres:3.5,sucres:1.5,sel:0.03},
    'Farine complète':{kcal:330,prot:12,carbs:63,lip:2},
    'Farine d\'avoine':{kcal:380,prot:13,carbs:60,lip:7},
    'Farine de riz':{kcal:360,prot:6,carbs:80,lip:1,fibres:3.3,sucres:0.9,satures:0.46,sel:0.13},
    'Farine de pois chiche':{kcal:380,prot:20,carbs:55,lip:7,fibres:10.8,sucres:10.9,satures:0.69,sel:0.16},
    'Farine de coco':{kcal:400,prot:18,carbs:20,lip:14},
    'Poudre d\'amande':{kcal:600,prot:25,carbs:8,lip:53},
    'Maïzena (fécule de maïs)':{kcal:360,prot:0.3,carbs:88,lip:0.1},
    'Tapioca':{kcal:350,prot:0.2,carbs:88,lip:0,fibres:0.9,sucres:3.35,satures:0.01,sel:0},
    'Gressins':{kcal:410,prot:12,carbs:68,lip:10,fibres:5.16,sucres:2.06,satures:2.78,sel:1.8},
    'Crackers':{kcal:430,prot:10,carbs:65,lip:13,fibres:4.1,sucres:0.4,satures:4.5,sel:1.5},
    'Biscottes complètes':{kcal:390,prot:13,carbs:70,lip:5,fibres:8.84,sucres:4.32,satures:2.61,sel:1.25},
    'Cracottes':{kcal:370,prot:11,carbs:75,lip:3},
    'Galettes de maïs':{kcal:380,prot:8,carbs:82,lip:2,sucres:0.3,satures:0.36,sel:0.2},
    'Pain suédois (Wasa)':{kcal:330,prot:10,carbs:60,lip:2},
    'Nutella':{kcal:540,prot:6,carbs:57,lip:31},
    'Brioche':{kcal:370,prot:8,carbs:50,lip:15,fibres:2.2,sucres:12.7,satures:5.01,sel:1},
    'Pain au lait':{kcal:340,prot:8,carbs:52,lip:10,fibres:1.5,sucres:9.94,satures:8.34,sel:1.1},
    'Madeleine':{kcal:450,prot:6,carbs:52,lip:24,fibres:1.2,sucres:23.8,satures:2.49,sel:0.89},
    'Gaufre nature':{kcal:300,prot:7,carbs:40,lip:12,fibres:1.9,sucres:37,satures:8,sel:0.77},
    'Crêpe nature':{kcal:200,prot:6,carbs:28,lip:7,fibres:1.7,sucres:36.7,satures:10.2,sel:0.64},
    'Barre de céréales':{kcal:400,prot:6,carbs:65,lip:12},
    'Mars':{kcal:450,prot:4,carbs:70,lip:17},
    'Snickers':{kcal:490,prot:9,carbs:57,lip:24},
    'Twix':{kcal:495,prot:5,carbs:64,lip:24},
    'Kinder Bueno':{kcal:570,prot:9,carbs:49,lip:37},
    'KitKat':{kcal:520,prot:7,carbs:60,lip:27},
    'M&M\'s':{kcal:490,prot:5,carbs:70,lip:20},
    'Bonbons gélifiés':{kcal:340,prot:6,carbs:77,lip:0.2,fibres:0.5,sucres:68.1,satures:0.15,sel:0.05},
    'Guimauve':{kcal:320,prot:4,carbs:79,lip:0.1,fibres:0.23,sucres:65.6,satures:0.07,sel:0.09},
    'Chocolat blanc':{kcal:540,prot:6,carbs:58,lip:31,fibres:1,sucres:56,satures:21.3,sel:0.22},
    'Chocolat noir 85%':{kcal:590,prot:10,carbs:22,lip:50},
    'Chocolat praliné':{kcal:550,prot:6,carbs:52,lip:34,fibres:5.07,sucres:48.8,satures:16.9,sel:0.04},
    'Glace vanille':{kcal:200,prot:3.5,carbs:24,lip:10},
    'Sorbet fruits':{kcal:130,prot:0.5,carbs:32,lip:0.2},
    'Crème dessert chocolat':{kcal:125,prot:3,carbs:20,lip:3.5,fibres:3.6,sucres:16.8,satures:0.6,sel:0.1},
    'Flan pâtissier':{kcal:190,prot:5,carbs:28,lip:6,fibres:0.7,sucres:18.4,satures:7.16,sel:0.24},
    'Riz au lait':{kcal:120,prot:3.5,carbs:20,lip:2.8,fibres:0.28,sucres:13,satures:1.97,sel:0.13},
    'Mousse au chocolat':{kcal:230,prot:5,carbs:26,lip:12,fibres:5.1,sucres:23.1,satures:9.04,sel:0.36},
    'Tiramisu':{kcal:280,prot:5,carbs:30,lip:15,fibres:1.2,sucres:19.5,satures:6.41,sel:0.19},
    'Brownie':{kcal:430,prot:5,carbs:50,lip:23,fibres:3.4,sucres:35.1,satures:7.32,sel:0.35},
    'Tarte aux pommes':{kcal:250,prot:3,carbs:35,lip:11,fibres:0.7,sucres:24.9,satures:5.98,sel:0.19},
    'Éclair au chocolat':{kcal:260,prot:5,carbs:25,lip:15},
    'Beignet':{kcal:400,prot:6,carbs:45,lip:22,fibres:1.95,sucres:3.03,satures:0.99,sel:0.69},
    'Chouquette':{kcal:360,prot:8,carbs:40,lip:18,fibres:6.1,sucres:27.1,satures:9.89,sel:1.08},
    'Compote de pomme':{kcal:80,prot:0.3,carbs:19,lip:0.2,fibres:1.53,sucres:20.7,satures:0.02,sel:0},
    'Confiture allégée':{kcal:170,prot:0.4,carbs:40,lip:0.1,fibres:1.8,sucres:38,satures:0.04,sel:0.02},
    'Raclette':{kcal:360,prot:23,carbs:0.5,lip:30,fibres:0,sucres:0,satures:18.5,sel:1.69},
    'Mimolette':{kcal:400,prot:26,carbs:0.5,lip:32,fibres:0,sucres:0,satures:17.4},
    'Gouda':{kcal:360,prot:25,carbs:1,lip:28,fibres:0,sucres:0.25,satures:20.3,sel:2},
    'Edam':{kcal:330,prot:26,carbs:1,lip:25,fibres:0,sucres:0.25,satures:16.9,sel:2.22},
    'Provolone':{kcal:350,prot:26,carbs:2,lip:27,fibres:0,sucres:0,satures:17.1,sel:2.19},
    'Halloumi':{kcal:320,prot:21,carbs:2,lip:25},
    'Burrata':{kcal:290,prot:15,carbs:2,lip:24},
    'Cancoillotte':{kcal:120,prot:15,carbs:2,lip:5,fibres:0,sucres:0,satures:7.06,sel:1.73},
    'Fromage râpé':{kcal:390,prot:27,carbs:1,lip:31},
    'Mozzarella light':{kcal:210,prot:20,carbs:2,lip:13},
    'Skyr aromatisé':{kcal:80,prot:9,carbs:10,lip:0.2},
    'Yaourt protéiné (type HiPRO)':{kcal:65,prot:10,carbs:5,lip:0},
    'Petit suisse aromatisé':{kcal:120,prot:7,carbs:13,lip:4},
    'Skyr à boire':{kcal:65,prot:7,carbs:8,lip:0.2},
    'Boisson protéinée prête':{kcal:70,prot:10,carbs:6,lip:1},
    'Cordon bleu':{kcal:250,prot:15,carbs:13,lip:15,fibres:0.78,sucres:2.2,satures:3.2,sel:1.73},
    'Escalope panée':{kcal:240,prot:16,carbs:14,lip:13,fibres:3.28,sucres:2.05,satures:3.02,sel:1.5},
    'Escalope de poulet panée':{kcal:230,prot:17,carbs:14,lip:11},
    'Gésiers confits':{kcal:160,prot:20,carbs:0,lip:9,fibres:1,sucres:0.2,satures:0.7,sel:1.92},
    'Jambon cru':{kcal:220,prot:27,carbs:0.5,lip:12,fibres:0,sucres:0.75,satures:5.09,sel:5.67},
    'Viande des Grisons':{kcal:180,prot:35,carbs:1,lip:3.5,fibres:0,sucres:1,satures:2.52,sel:3.83},
    'Filet mignon de porc cuit':{kcal:150,prot:26,carbs:0,lip:5},
    'Faux-filet cuit':{kcal:200,prot:27,carbs:0,lip:10},
    'Rumsteck cuit':{kcal:160,prot:28,carbs:0,lip:5},
    'Onglet cuit':{kcal:170,prot:27,carbs:0,lip:7},
    'Paleron cuit':{kcal:180,prot:26,carbs:0,lip:8},
    'Poitrine de porc':{kcal:350,prot:17,carbs:0,lip:31,fibres:0,sucres:0.6,satures:8.3,sel:2},
    'Travers de porc':{kcal:290,prot:20,carbs:0,lip:23},
    'Saucisse de Strasbourg (knack)':{kcal:290,prot:12,carbs:2,lip:26,fibres:1.37,sucres:1.06,satures:10.9,sel:2.21},
    'Chipolata':{kcal:300,prot:15,carbs:1,lip:27,fibres:0.4,sucres:0.32,satures:7.61,sel:1.58},
    'Saucisse de Toulouse':{kcal:310,prot:16,carbs:1,lip:27,fibres:0,sucres:1,satures:11.3,sel:1.89},
    'Kefta':{kcal:240,prot:17,carbs:3,lip:18},
    'Haché de veau':{kcal:190,prot:19,carbs:0,lip:12},
    'Burger de veau':{kcal:190,prot:19,carbs:0,lip:12,fibres:0,sucres:0,satures:5.2,sel:0.35},
    'Haché porc-veau':{kcal:250,prot:17,carbs:0,lip:20},
    'Steak végétal':{kcal:180,prot:16,carbs:7,lip:10},
    'Tofu fumé':{kcal:150,prot:16,carbs:2,lip:9,fibres:0.5,sucres:0.85,satures:1.53,sel:0.74},
    'Poulet rôti (avec peau)':{kcal:220,prot:25,carbs:0,lip:13},
    'Poulet rôti (sans peau)':{kcal:165,prot:29,carbs:0,lip:5},
    'Viande de kebab':{kcal:215,prot:18,carbs:2,lip:15},
    'Gyros de poulet':{kcal:180,prot:22,carbs:2,lip:9},
    'Rôti de dinde cuit':{kcal:140,prot:28,carbs:0,lip:3},
    'Merlu cuit':{kcal:95,prot:20,carbs:0,lip:1.5,fibres:0,sucres:0,satures:0.92,sel:0.25},
    'Merlan cuit':{kcal:90,prot:20,carbs:0,lip:1,fibres:0,sucres:0,satures:0.13,sel:0.28},
    'Églefin cuit':{kcal:90,prot:20,carbs:0,lip:0.8,fibres:0,sucres:0,satures:0.1,sel:0.18},
    'Flétan cuit':{kcal:120,prot:22,carbs:0,lip:3,fibres:0,sucres:0,satures:2.07,sel:0.36},
    'Lotte cuite':{kcal:90,prot:19,carbs:0,lip:1.5},
    'Raie cuite':{kcal:95,prot:21,carbs:0,lip:1,fibres:0,sucres:0,satures:0.1,sel:0.38},
    'Pangasius cuit':{kcal:95,prot:17,carbs:0,lip:3},
    'Thon en boîte à l\'huile':{kcal:190,prot:26,carbs:0,lip:9},
    'Sardines à l\'huile':{kcal:220,prot:24,carbs:0,lip:14},
    'Maquereau en boîte (tomate)':{kcal:180,prot:17,carbs:2,lip:11},
    'Rillettes de thon':{kcal:210,prot:15,carbs:2,lip:16,fibres:1.4,sucres:1.2,satures:1.1,sel:1.24},
    'Rillettes de saumon':{kcal:240,prot:14,carbs:2,lip:20,fibres:1.6,sucres:0.9,satures:2.4,sel:1.3},
    'Tarama':{kcal:500,prot:5,carbs:6,lip:51,fibres:0.74,sucres:0.75,satures:4.61,sel:1.69},
    'Œufs de lump':{kcal:110,prot:12,carbs:3,lip:5},
    'Saumon gravlax':{kcal:200,prot:20,carbs:3,lip:12},
    'Poisson pané':{kcal:200,prot:13,carbs:17,lip:9,fibres:0.9,sucres:1.1,satures:2.15,sel:0.84},
    'Brandade de morue':{kcal:140,prot:10,carbs:10,lip:7},
    'Accras de morue':{kcal:260,prot:9,carbs:25,lip:14},
    'Chili con carne':{kcal:120,prot:9,carbs:10,lip:4.5,fibres:3.56,sucres:2.58,satures:1.13,sel:0.93},
    'Couscous complet (plat)':{kcal:140,prot:8,carbs:18,lip:4},
    'Paella':{kcal:155,prot:9,carbs:18,lip:5,fibres:1.85,sucres:1.2,satures:1.28,sel:0.87},
    'Risotto':{kcal:160,prot:5,carbs:22,lip:6,fibres:0.5,sucres:0.85,satures:2,sel:0.76},
    'Hachis parmentier':{kcal:130,prot:8,carbs:12,lip:5.5,fibres:1.43,sucres:1.47,satures:4.7,sel:0.83},
    'Gratin dauphinois':{kcal:130,prot:3,carbs:14,lip:7,fibres:1.5,sucres:2.08,satures:2.67,sel:0.81},
    'Blanquette de veau':{kcal:120,prot:11,carbs:5,lip:6,fibres:0.8,sucres:0.3,satures:2.03,sel:0.74},
    'Ratatouille':{kcal:45,prot:1.2,carbs:6,lip:1.8,fibres:2.03,sucres:3.91,satures:0.47,sel:0.94},
    'Tajine de poulet':{kcal:110,prot:10,carbs:7,lip:5,fibres:3,sucres:6.8,satures:0.4,sel:1.17},
    'Curry de poulet':{kcal:130,prot:11,carbs:6,lip:7},
    'Poulet tikka masala':{kcal:150,prot:12,carbs:6,lip:9},
    'Pad thaï':{kcal:170,prot:8,carbs:22,lip:6},
    'Nouilles sautées':{kcal:160,prot:6,carbs:24,lip:4.5,fibres:1.6,sucres:1.7,satures:1.16,sel:0.84},
    'Bo bun':{kcal:120,prot:8,carbs:15,lip:3.5},
    'Pho (soupe)':{kcal:55,prot:4,carbs:7,lip:1.2},
    'Poke bowl saumon':{kcal:140,prot:9,carbs:15,lip:5},
    'Buddha bowl':{kcal:120,prot:5,carbs:16,lip:4},
    'Salade César':{kcal:180,prot:9,carbs:7,lip:13,fibres:2,sucres:1.71,satures:2.36,sel:0.75},
    'Salade niçoise':{kcal:110,prot:7,carbs:4,lip:7,fibres:1.5,sucres:1.35,satures:0.63,sel:0.76},
    'Taboulé':{kcal:140,prot:4,carbs:22,lip:4,fibres:2.5,sucres:4.9,satures:0.67,sel:1},
    'Soupe de légumes':{kcal:35,prot:1.5,carbs:5,lip:0.8,fibres:0.54,sucres:1.07,satures:0.71,sel:0.66},
    'Velouté de tomate':{kcal:40,prot:1,carbs:6,lip:1.2},
    'Gaspacho':{kcal:35,prot:1,carbs:5,lip:1},
    'Omelette nature':{kcal:155,prot:11,carbs:1,lip:12,fibres:0,sucres:0.4,satures:10.1,sel:0.58},
    'Œufs brouillés':{kcal:150,prot:10,carbs:1,lip:12},
    'Œuf au plat':{kcal:180,prot:13,carbs:0.6,lip:14},
    'Œuf poché':{kcal:145,prot:12.5,carbs:0.7,lip:10},
    'Croque-madame':{kcal:260,prot:13,carbs:22,lip:13,fibres:1.13,sucres:1.37,satures:7.42,sel:1.29},
    'Quiche aux légumes':{kcal:210,prot:7,carbs:18,lip:12},
    'Tarte au thon':{kcal:230,prot:10,carbs:19,lip:13},
    'Pizza 4 fromages':{kcal:280,prot:12,carbs:28,lip:13,fibres:2.7,sucres:2.61,satures:5.51,sel:1.11},
    'Pizza reine':{kcal:240,prot:11,carbs:28,lip:9,fibres:2.3,sucres:3.16,satures:2.91,sel:1.3},
    'Pizza végétarienne':{kcal:210,prot:8,carbs:28,lip:7},
    'Pâtes bolognaise (plat)':{kcal:140,prot:7,carbs:18,lip:4},
    'Pâtes au pesto (plat)':{kcal:180,prot:6,carbs:24,lip:7},
    'Gratin de pâtes':{kcal:180,prot:8,carbs:20,lip:8,fibres:1,sucres:2.19,satures:4.85,sel:0.85},
    'Raviolis en boîte':{kcal:90,prot:4,carbs:12,lip:2.5},
    'Cannelloni':{kcal:140,prot:7,carbs:15,lip:6},
    'Moussaka':{kcal:120,prot:7,carbs:8,lip:7,fibres:2.84,sucres:3.01,satures:3.37,sel:0.97},
    'Chou farci':{kcal:100,prot:7,carbs:8,lip:4.5,fibres:3.13,sucres:2,sel:0.87},
    'Tomates farcies':{kcal:110,prot:8,carbs:7,lip:5.5,fibres:2.31,sucres:0.88,satures:3.24,sel:0.7},
    'Paupiette cuite':{kcal:190,prot:17,carbs:3,lip:12,fibres:0.9,sucres:0.3,satures:8.19,sel:1.07},
    'Poulet basquaise':{kcal:105,prot:12,carbs:4,lip:4.5,fibres:1.3,sucres:2,satures:1.7,sel:0.89},
    'Colombo de poulet':{kcal:115,prot:11,carbs:5,lip:5.5},
    'Chou rouge':{kcal:30,prot:1.4,carbs:5,lip:0.2,fibres:2.8,sucres:3.9,satures:0.01,sel:0.04},
    'Chou blanc':{kcal:27,prot:1.3,carbs:4.5,lip:0.1,fibres:3.5,sucres:4.2,satures:0.27,sel:0.03},
    'Chou romanesco':{kcal:30,prot:2.5,carbs:4,lip:0.3,fibres:2.35,sucres:2.2,satures:0.05,sel:0.04},
    'Haricots beurre':{kcal:30,prot:1.8,carbs:4.5,lip:0.2,fibres:2.45,satures:0.03,sel:0.01},
    'Pois gourmands':{kcal:45,prot:3,carbs:6,lip:0.2,fibres:2.63,sucres:4,satures:0.04,sel:0.01},
    'Artichaut cuit':{kcal:45,prot:3,carbs:5,lip:0.2,fibres:8.3,sucres:0.99,satures:0.07,sel:0.15},
    'Panais':{kcal:70,prot:1.2,carbs:13,lip:0.4,fibres:4.7,sucres:4.8,satures:0.06,sel:0.02},
    'Butternut':{kcal:45,prot:1,carbs:10,lip:0.1},
    'Potimarron':{kcal:40,prot:1.1,carbs:8,lip:0.2,fibres:1.1,satures:0.03,sel:0.07},
    'Courge spaghetti':{kcal:30,prot:0.6,carbs:6,lip:0.3,fibres:1.5,sucres:2.76,satures:0.12,sel:0.04},
    'Maïs doux en boîte':{kcal:90,prot:3,carbs:17,lip:1},
    'Cœurs de palmier':{kcal:30,prot:2.5,carbs:4,lip:0.3},
    'Pousses de soja':{kcal:35,prot:3.5,carbs:3.5,lip:0.5},
    'Pousses de bambou':{kcal:25,prot:2.5,carbs:3,lip:0.3},
    'Algue nori':{kcal:190,prot:30,carbs:15,lip:2},
    'Tomates cerises':{kcal:20,prot:0.9,carbs:3,lip:0.2,fibres:1.2,sucres:4.8,satures:0.01,sel:0.01},
    'Tomates séchées':{kcal:210,prot:5,carbs:35,lip:4,fibres:12.3,sucres:37.6,satures:0.46,sel:0.62},
    'Piment jalapeño':{kcal:30,prot:1,carbs:6,lip:0.4},
    'Oignon rouge':{kcal:40,prot:1.1,carbs:9,lip:0.1,fibres:2.5,sucres:5.2,satures:0.14,sel:0.01},
    'Ciboulette':{kcal:30,prot:3,carbs:4,lip:0.5},
    'Céleri branche':{kcal:15,prot:0.8,carbs:2,lip:0.1,fibres:2.2,sucres:1.3,satures:0.01,sel:0.2},
    'Épinards surgelés':{kcal:25,prot:2.8,carbs:1.5,lip:0.4,fibres:2.7,sucres:0.6,satures:0.07,sel:0.1},
    'Poêlée de légumes':{kcal:60,prot:2,carbs:7,lip:2.5,fibres:2.94,sucres:1.81,satures:0.22,sel:0.35},
    'Jardinière de légumes':{kcal:50,prot:2,carbs:7,lip:1.5},
    'Nectarine':{kcal:45,prot:1,carbs:10,lip:0.3,fibres:1.7,sucres:7.89,satures:0.03,sel:0},
    'Prune':{kcal:48,prot:0.7,carbs:11,lip:0.2,fibres:1.5,sucres:9.92,satures:0.04,sel:0.01},
    'Mirabelle':{kcal:60,prot:0.7,carbs:14,lip:0.2,fibres:2.2,sucres:13.3,satures:0.01,sel:0.01},
    'Rhubarbe':{kcal:21,prot:0.9,carbs:4,lip:0.2,fibres:2.47,sucres:1.47,satures:0.05,sel:0.01},
    'Groseilles':{kcal:45,prot:1.1,carbs:10,lip:0.3,fibres:4.6,sucres:6.63,satures:0.21,sel:0.01},
    'Mûres':{kcal:45,prot:1.4,carbs:9,lip:0.5,fibres:5.2,sucres:6.1,satures:0.07,sel:0.01},
    'Cranberries séchées':{kcal:310,prot:0.2,carbs:77,lip:1.1},
    'Raisin frais':{kcal:70,prot:0.6,carbs:17,lip:0.3},
    'Citron':{kcal:30,prot:0.9,carbs:9,lip:0.3,fibres:0.5,sucres:0.8,satures:0.01,sel:0.01},
    'Citron vert':{kcal:30,prot:0.7,carbs:10,lip:0.2,fibres:4.3,sucres:2.1,satures:0.01,sel:0.01},
    'Banane plantain':{kcal:120,prot:1.3,carbs:29,lip:0.4,fibres:2.3,satures:0.14,sel:0.01},
    'Fruits au sirop':{kcal:80,prot:0.4,carbs:19,lip:0.1},
    'Salade de fruits fraîche':{kcal:55,prot:0.6,carbs:13,lip:0.2},
    'Abricot frais':{kcal:48,prot:1.4,carbs:11,lip:0.4},
    'Coing':{kcal:57,prot:0.4,carbs:14,lip:0.1,fibres:1.9,sucres:6.3,satures:0.01,sel:0.01},
    'Lait d\'avoine':{kcal:45,prot:0.8,carbs:7,lip:1.5},
    'Lait de soja':{kcal:40,prot:3.3,carbs:2.5,lip:1.8},
    'Lait de riz':{kcal:50,prot:0.3,carbs:10,lip:1},
    'Boisson énergisante':{kcal:45,prot:0,carbs:11,lip:0,fibres:0.1,sucres:11.7,satures:0,sel:0.11},
    'Boisson énergisante zéro':{kcal:2,prot:0,carbs:0.2,lip:0},
    'Boisson isotonique':{kcal:26,prot:0,carbs:6.5,lip:0},
    'Kombucha':{kcal:20,prot:0,carbs:5,lip:0,fibres:0.5,sucres:1.45,satures:0.01,sel:0.01},
    'Limonade':{kcal:40,prot:0,carbs:10,lip:0,fibres:0,sucres:8.45,satures:0,sel:0.01},
    'Ice tea':{kcal:30,prot:0,carbs:7,lip:0},
    'Ice tea zéro':{kcal:1,prot:0,carbs:0.1,lip:0},
    'Coca zéro':{kcal:0.3,prot:0,carbs:0.1,lip:0},
    // ===== SODAS — formats standard (valeurs pour 100ml) =====
    'Coca-Cola canette 33cl':{kcal:42,prot:0,carbs:10.6,lip:0,unit:330,unitLabel:'canette'},
    'Coca-Cola bouteille 50cl':{kcal:42,prot:0,carbs:10.6,lip:0,unit:500,unitLabel:'bouteille'},
    'Coca-Cola bouteille 1,5L':{kcal:42,prot:0,carbs:10.6,lip:0,unit:1500,unitLabel:'bouteille'},
    'Coca-Cola Zero canette 33cl':{kcal:0.3,prot:0,carbs:0,lip:0,unit:330,unitLabel:'canette'},
    'Coca-Cola Zero bouteille 50cl':{kcal:0.3,prot:0,carbs:0,lip:0,unit:500,unitLabel:'bouteille'},
    'Coca-Cola Light canette 33cl':{kcal:0.2,prot:0,carbs:0,lip:0,unit:330,unitLabel:'canette'},
    'Fanta Orange canette 33cl':{kcal:38,prot:0,carbs:9,lip:0,unit:330,unitLabel:'canette'},
    'Fanta Orange bouteille 50cl':{kcal:38,prot:0,carbs:9,lip:0,unit:500,unitLabel:'bouteille'},
    'Fanta Zero canette 33cl':{kcal:5,prot:0,carbs:1,lip:0,unit:330,unitLabel:'canette'},
    'Sprite canette 33cl':{kcal:37,prot:0,carbs:8.8,lip:0,unit:330,unitLabel:'canette'},
    'Sprite Zero canette 33cl':{kcal:1,prot:0,carbs:0,lip:0,unit:330,unitLabel:'canette'},
    'Ice Tea Pêche canette 33cl':{kcal:30,prot:0,carbs:7.4,lip:0,unit:330,unitLabel:'canette'},
    'Ice Tea Pêche bouteille 50cl':{kcal:30,prot:0,carbs:7.4,lip:0,unit:500,unitLabel:'bouteille'},
    'Ice Tea Zero canette 33cl':{kcal:1,prot:0,carbs:0.1,lip:0,unit:330,unitLabel:'canette'},
    'Schweppes Tonic canette 33cl':{kcal:38,prot:0,carbs:9,lip:0,unit:330,unitLabel:'canette'},
    'Schweppes Agrum canette 33cl':{kcal:40,prot:0,carbs:9.5,lip:0,unit:330,unitLabel:'canette'},
    'Orangina canette 33cl':{kcal:44,prot:0,carbs:10.5,lip:0,unit:330,unitLabel:'canette'},
    'Pepsi canette 33cl':{kcal:43,prot:0,carbs:11,lip:0,unit:330,unitLabel:'canette'},
    'Pepsi Max canette 33cl':{kcal:0.3,prot:0,carbs:0,lip:0,unit:330,unitLabel:'canette'},
    'Seven Up canette 33cl':{kcal:37,prot:0,carbs:9,lip:0,unit:330,unitLabel:'canette'},
    'Red Bull canette 25cl':{kcal:45,prot:0,carbs:11,lip:0,unit:250,unitLabel:'canette'},
    'Red Bull Sugarfree canette 25cl':{kcal:3,prot:0,carbs:0,lip:0,unit:250,unitLabel:'canette'},
    'Monster Energy canette 50cl':{kcal:47,prot:0,carbs:11,lip:0,unit:500,unitLabel:'canette'},
    'Limonade canette 33cl':{kcal:40,prot:0,carbs:10,lip:0,unit:330,unitLabel:'canette'},
    'Jus multifruits':{kcal:50,prot:0.4,carbs:12,lip:0.1,fibres:0.5,sucres:10.1,satures:0.01,sel:0},
    'Jus de raisin':{kcal:65,prot:0.3,carbs:16,lip:0.1,fibres:0.14,sucres:16,satures:0.03,sel:0.01},
    'Jus d\'ananas':{kcal:50,prot:0.3,carbs:12,lip:0.1},
    'Bière sans alcool':{kcal:25,prot:0.3,carbs:5.5,lip:0,fibres:0,sucres:2.55,satures:0,sel:0},
    'Sirop dilué (1 verre)':{kcal:35,prot:0,carbs:9,lip:0},
    'Eau aromatisée zéro':{kcal:1,prot:0,carbs:0.1,lip:0},
    'Son d\'avoine':{kcal:350,prot:17,carbs:50,lip:7},
    'Son de blé':{kcal:290,prot:16,carbs:45,lip:5,fibres:42,sucres:2.46,satures:0.84,sel:0.03},
    'Germe de blé':{kcal:360,prot:26,carbs:40,lip:10,fibres:16.3,sucres:10,satures:1.83,sel:0.02},
    'Levure nutritionnelle':{kcal:340,prot:45,carbs:25,lip:5},
    'Spiruline':{kcal:290,prot:57,carbs:20,lip:8,fibres:3.6,sucres:3.1,satures:2.65,sel:2.62},
    'Psyllium':{kcal:200,prot:2,carbs:80,lip:0.6},
    'Graines de chanvre':{kcal:560,prot:32,carbs:9,lip:49},
    'Protéine de chanvre':{kcal:380,prot:50,carbs:15,lip:11},
    'Bouillon cube':{kcal:230,prot:15,carbs:20,lip:12},
    'Tofu soyeux':{kcal:55,prot:5,carbs:2,lip:3,fibres:0.6,sucres:1.13,satures:0.47,sel:0.01},
    'Riz de konjac':{kcal:9,prot:0.1,carbs:2,lip:0},
    'Nouilles de konjac':{kcal:9,prot:0.1,carbs:2,lip:0},
    'Pain protéiné':{kcal:250,prot:22,carbs:25,lip:7},
    'Wrap protéiné':{kcal:280,prot:20,carbs:35,lip:6},
    'Pancakes protéinés':{kcal:220,prot:18,carbs:25,lip:5},
    'Cornflakes protéinés':{kcal:380,prot:25,carbs:55,lip:4},
    // ===== FAST-FOOD (valeurs par 100g, unit = poids d'une pièce) =====
    'Giant (Quick)':{kcal:311,prot:14.5,carbs:14.2,lip:21.7,unit:172,unitLabel:'burger'},
    'Giant Max (Quick)':{kcal:310,prot:14,carbs:15.8,lip:21,unit:230,unitLabel:'burger'},
    'Mega Giant (Quick)':{kcal:307,prot:13.4,carbs:12.4,lip:21,unit:291,unitLabel:'burger'},
    'Cheeseburger (Quick)':{kcal:257,prot:13,carbs:26,lip:11,unit:115,unitLabel:'burger'},
    'Big Mac (McDo)':{kcal:233,prot:12.3,carbs:19.6,lip:11.9,unit:219,unitLabel:'burger'},
    'Cheeseburger (McDo)':{kcal:261,prot:13,carbs:26,lip:10.4,unit:115,unitLabel:'burger'},
    'Hamburger (McDo)':{kcal:250,prot:12.5,carbs:30,lip:8.5,unit:100,unitLabel:'burger'},
    'McChicken (McDo)':{kcal:260,prot:11.7,carbs:25.7,lip:12.3,unit:171,unitLabel:'burger'},
    'CBO (McDo)':{kcal:284,prot:12.6,carbs:23,lip:15.2,unit:230,unitLabel:'burger'},
    'Big Tasty (McDo)':{kcal:255,prot:12.4,carbs:15.5,lip:16.4,unit:330,unitLabel:'burger'},
    'Nuggets (McDo)':{kcal:260,prot:15.6,carbs:15.6,lip:13.5,unit:16,unitLabel:'nugget'},
    'Frites moyennes (McDo)':{kcal:298,prot:3.5,carbs:38,lip:15,unit:114,unitLabel:'portion'},
    'Frites grandes (McDo)':{kcal:298,prot:3.5,carbs:38,lip:15,unit:150,unitLabel:'portion'},
    'Whopper (Burger King)':{kcal:244,prot:10.4,carbs:18,lip:14.8,unit:270,unitLabel:'burger'},
    'Long Chicken (Burger King)':{kcal:274,prot:11.3,carbs:20.9,lip:15.7,unit:230,unitLabel:'burger'},
    'Kebab dürüm':{kcal:215,prot:12,carbs:20,lip:10,unit:400,unitLabel:'dürüm'},
    'Kebab pita':{kcal:210,prot:13,carbs:19,lip:9.5,unit:300,unitLabel:'pita'},
    'Fricadelle':{kcal:270,prot:11,carbs:15,lip:18,unit:90,unitLabel:'pièce'},
    'Sauce andalouse':{kcal:520,prot:1,carbs:12,lip:52},
    'Sauce samouraï':{kcal:540,prot:1.2,carbs:10,lip:55},
    // Menus complets (burger + frites moyennes + Coca moyen)
    'Menu Giant (Quick)':{kcal:145,prot:4.2,carbs:15,lip:7.5,unit:682,unitLabel:'menu'},
    'Menu Giant Max (Quick)':{kcal:151,prot:4.4,carbs:15.6,lip:7.8,unit:740,unitLabel:'menu'},
    'Menu Big Mac (McDo)':{kcal:135,prot:4.2,carbs:16.8,lip:5.9,unit:733,unitLabel:'menu'},
    'Menu McChicken (McDo)':{kcal:135,prot:3.6,carbs:17.5,lip:5.6,unit:685,unitLabel:'menu'},
    'Menu CBO (McDo)':{kcal:151,prot:4.4,carbs:16.5,lip:7.1,unit:744,unitLabel:'menu'},
    'Menu Whopper (Burger King)':{kcal:143,prot:4,carbs:16.2,lip:7,unit:786,unitLabel:'menu'},

    // ===== COMPLEMENTS ALIMENTAIRES =====
    // Valeurs generiques pour 100 g de poudre, sauf mention d'unite.
    // Les etiquettes varient d'une marque a l'autre : ce sont des
    // reperes, pas des releves. En cas d'ecart, le scan du code-barres
    // cree l'aliment exact et prend le pas sur ces valeurs.
    // Les entrees « dose » et « gelule » evitent d'avoir a peser :
    // on compte des mesurettes, pas des grammes.
    'Collagène (peptides)':{kcal:360,prot:90,carbs:0,lip:0},
    'Collagène (dose 10g)':{kcal:360,prot:90,carbs:0,lip:0,unit:10,unitLabel:'dose'},
    'Créatine monohydrate':{kcal:0,prot:0,carbs:0,lip:0,fibres:0,sucres:0,satures:0,sel:0},
    'Créatine (dose 5g)':{kcal:0,prot:0,carbs:0,lip:0,fibres:0,sucres:0,satures:0,sel:0,unit:5,unitLabel:'dose'},
    'BCAA poudre':{kcal:400,prot:100,carbs:0,lip:0},
    'EAA poudre':{kcal:400,prot:100,carbs:0,lip:0},
    'Glutamine poudre':{kcal:400,prot:100,carbs:0,lip:0},
    'Beta-alanine':{kcal:0,prot:0,carbs:0,lip:0},
    'Caséine micellaire':{kcal:365,prot:82,carbs:4,lip:1.5},
    'Protéine de riz':{kcal:390,prot:80,carbs:6,lip:3},
    'Protéine de boeuf':{kcal:370,prot:85,carbs:2,lip:1},
    'Blanc d\'oeuf en poudre':{kcal:380,prot:82,carbs:5,lip:0.5},
    'Pré-workout (dose 10g)':{kcal:20,prot:0,carbs:5,lip:0,unit:10,unitLabel:'dose'},
    'Électrolytes (dose)':{kcal:0,prot:0,carbs:0,lip:0,unit:5,unitLabel:'dose'},
    'Huile de poisson (capsule 1g)':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:25,sel:0,unit:1,unitLabel:'capsule'},
    'Huile de krill (capsule 1g)':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:30,sel:0,unit:1,unitLabel:'capsule'},
    'Huile MCT':{kcal:830,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:97,sel:0},

    // ===== HUILES A LA CUILLERE A SOUPE =====
    // Raci, 5/09. Personne ne pese son filet d'huile : on compte a la
    // cuillere. Une cuillere a soupe rase = 10 g (~11 ml, l'huile pese
    // 0,92 g/ml) — c'est la mesure de reference de l'ANSES, et celle
    // du protocole de Raci, 11 ml par repas.
    'Huile d\'olive (cuillère à soupe, 10g)':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:15.2,sel:0.01,unit:10,unitLabel:'c. à s.'},
    'Huile de colza (cuillère à soupe, 10g)':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:7.26,sel:0,unit:10,unitLabel:'c. à s.'},
    'Huile de tournesol (cuillère à soupe, 10g)':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:11.1,sel:0.03,unit:10,unitLabel:'c. à s.'},
    'Huile de coco (cuillère à soupe, 10g)':{kcal:862,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:86.5,sel:0,unit:10,unitLabel:'c. à s.'},
    'Huile de lin (cuillère à soupe, 10g)':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:9.19,sel:0,unit:10,unitLabel:'c. à s.'},
    'Huile de sésame (cuillère à soupe, 10g)':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:14.9,sel:0,unit:10,unitLabel:'c. à s.'},
    'Huile d\'arachide (cuillère à soupe, 10g)':{kcal:900,prot:0,carbs:0,lip:100,unit:10,unitLabel:'c. à s.'},
    'Huile de noix (cuillère à soupe, 10g)':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:10,sel:0,unit:10,unitLabel:'c. à s.'},
    'Huile de noisette (cuillère à soupe, 10g)':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:8.34,sel:0,unit:10,unitLabel:'c. à s.'},
    'Huile d\'avocat (cuillère à soupe, 10g)':{kcal:900,prot:0,carbs:0,lip:100,unit:10,unitLabel:'c. à s.'},
    'Huile MCT (cuillère à soupe, 10g)':{kcal:830,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:97,sel:0,unit:10,unitLabel:'c. à s.'},
    // Les micronutriments n'apportent pas d'energie : ils sont a zero.
    // Ils restent dans la base pour figurer au journal, pas pour peser
    // dans le total.
    'Multivitamines (comprimé)':{kcal:0,prot:0,carbs:0,lip:0,unit:1,unitLabel:'comprimé'},
    'Vitamine D (gélule)':{kcal:0,prot:0,carbs:0,lip:0,unit:1,unitLabel:'gélule'},
    'Vitamine C (comprimé)':{kcal:0,prot:0,carbs:0,lip:0,unit:1,unitLabel:'comprimé'},
    'Magnésium (comprimé)':{kcal:0,prot:0,carbs:0,lip:0,unit:1,unitLabel:'comprimé'},
    'Zinc (comprimé)':{kcal:0,prot:0,carbs:0,lip:0,unit:1,unitLabel:'comprimé'},
    'Fer (comprimé)':{kcal:0,prot:0,carbs:0,lip:0,unit:1,unitLabel:'comprimé'},
    'Oméga-3 (gélule)':{kcal:900,prot:0,carbs:0,lip:100,fibres:0,sucres:0,satures:25,sel:0,unit:1,unitLabel:'gélule'},
    'Probiotiques (gélule)':{kcal:0,prot:0,carbs:0,lip:0,unit:1,unitLabel:'gélule'},
    'Caféine (comprimé 200mg)':{kcal:0,prot:0,carbs:0,lip:0,unit:1,unitLabel:'comprimé'},
    'Ashwagandha (gélule)':{kcal:0,prot:0,carbs:0,lip:0,unit:1,unitLabel:'gélule'},
    'Curcuma (gélule)':{kcal:0,prot:0,carbs:0,lip:0,unit:1,unitLabel:'gélule'},
    'Chlorella':{kcal:410,prot:58,carbs:23,lip:9},
    'Maca poudre':{kcal:325,prot:14,carbs:71,lip:1},
    'Gelée royale':{kcal:150,prot:13,carbs:15,lip:4},
    'Levure de bière':{kcal:350,prot:45,carbs:35,lip:2},

    // ===== POUDRES PROTEINEES =====
    // La base n'avait que « Whey », « Whey Iso » et « Caséine ». Or le
    // taux de proteines va de 70 a 90 g selon le procede : compter une
    // hydrolysee comme une concentree se paie 15 g d'ecart par dose.
    // Chaque poudre courante a donc son entree, et les plus utilisees
    // ont leur dose — on compte des mesurettes, pas des grammes.
    'Whey concentrée':{kcal:400,prot:78,carbs:8,lip:6},
    'Whey hydrolysée':{kcal:365,prot:88,carbs:2,lip:1},
    'Whey native':{kcal:380,prot:82,carbs:5,lip:3},
    'Clear whey':{kcal:355,prot:88,carbs:1,lip:0.5},
    'Whey Iso (dose 30g)':{kcal:360,prot:90,carbs:2,lip:1,unit:30,unitLabel:'dose'},
    'Whey concentrée (dose 30g)':{kcal:400,prot:78,carbs:8,lip:6,unit:30,unitLabel:'dose'},
    'Caséine (dose 30g)':{kcal:360,prot:80,carbs:5,lip:1.5,unit:30,unitLabel:'dose'},
    'Protéine de soja':{kcal:375,prot:88,carbs:2,lip:1},
    'Protéine végétale (mélange)':{kcal:385,prot:75,carbs:8,lip:6},
    'Protéine végétale (dose 30g)':{kcal:385,prot:75,carbs:8,lip:6,unit:30,unitLabel:'dose'},
    'Protéine de courge':{kcal:390,prot:60,carbs:12,lip:10},
    'Protéine de tournesol':{kcal:380,prot:55,carbs:15,lip:9},
    'Protéine d\'avoine':{kcal:375,prot:55,carbs:25,lip:6},
    'Protéine d\'amande':{kcal:400,prot:50,carbs:15,lip:12},
    'Protéine de lactosérum bio':{kcal:395,prot:80,carbs:7,lip:5},
    'Lait écrémé en poudre':{kcal:355,prot:35,carbs:52,lip:1},
    'Gainer (dose 100g)':{kcal:380,prot:25,carbs:60,lip:5,unit:100,unitLabel:'dose'},

    // ===== NUTRIMUSCLE =====
    // Valeurs pour 100 g relevees sur les etiquettes officielles.
    // Les doses reprennent la portion conseillee par la marque.
    'Nutrimuscle Deep Recovery Protein chocolat':{kcal:360,prot:76.5,carbs:7,lip:2,fibres:3.3,sucres:4.1,satures:1.65,sel:0.48},
    'Nutrimuscle Deep Recovery Protein chocolat (dose 40g)':{kcal:360,prot:76.5,carbs:7,lip:2,fibres:3.3,sucres:4.1,satures:1.65,sel:0.48,unit:40,unitLabel:'dose'},
    'Nutrimuscle Deep Recovery Protein vanille':{kcal:360,prot:74.8,carbs:12,lip:1.1,fibres:0.8,sucres:8.8,satures:1.1,sel:0.48},
    'Nutrimuscle Deep Recovery Protein vanille (dose 40g)':{kcal:360,prot:74.8,carbs:12,lip:1.1,fibres:0.8,sucres:8.8,satures:1.1,sel:0.48,unit:40,unitLabel:'dose'},
    'Nutrimuscle Whey Native Isolate nature':{kcal:373,prot:85.5,carbs:5.5,lip:1,sucres:5.5,satures:0,sel:0},
    'Nutrimuscle Whey Native Isolate nature (dose 30g)':{kcal:373,prot:85.5,carbs:5.5,lip:1,sucres:5.5,satures:0,sel:0,unit:30,unitLabel:'dose'},
    'Nutrimuscle Whey Native Isolate chocolat':{kcal:370,prot:81,carbs:7.2,lip:1.45,sucres:5.58,satures:0.31,sel:0},
    'Nutrimuscle Whey Native Isolate chocolat (dose 30g)':{kcal:370,prot:81,carbs:7.2,lip:1.45,sucres:5.58,satures:0.31,sel:0,unit:30,unitLabel:'dose'},
    'Nutrimuscle Whey Native Isolate vanille':{kcal:371,prot:80,carbs:10.2,lip:0.95,sucres:7.23,satures:0.1,sel:0.01},
    'Nutrimuscle Protimuscle whey + caseine':{kcal:370,prot:77,carbs:11,lip:2},
    'Nutrimuscle Protimuscle whey + caseine (dose 30g)':{kcal:370,prot:77,carbs:11,lip:2,unit:30,unitLabel:'dose'},
    'Nutrimuscle Isolat de caseine micellaire chocolat':{kcal:359,prot:78.6,carbs:5.25,lip:2.06,sucres:3.24,satures:1.24,sel:0.23},
    'Nutrimuscle Isolat de caseine micellaire vanille':{kcal:360,prot:78.2,carbs:8.33,lip:1.4,sucres:5.31,satures:0.84,sel:0.24},
    'Nutrimuscle Isolat de caseine micellaire (dose 40g)':{kcal:359,prot:78.6,carbs:5.25,lip:2.06,sucres:3.24,satures:1.24,sel:0.23,unit:40,unitLabel:'dose'},
};

// Macros d'un ingredient {name, portion} a partir de la DB
export function macrosOf(ing){
    const custom = typeof window !== 'undefined' && window.__customFoods;
    const d = DB[ing.name] || (custom && custom[ing.name]);
    if(!d) return { kcal:0, prot:0, carbs:0, lip:0 };
    // Aliment a l'unite (oeuf, canette, dose de whey...) : la portion
    // COMPTE des pieces, pas des grammes — comme dans la reference v1.
    // Une piece reste une piece cuite ou crue : pas de facteur de cuisson.
    if (d.unit) {
      const f = ((parseFloat(ing.portion) || 0) * d.unit) / 100;
      return { kcal:d.kcal*f, prot:d.prot*f, carbs:d.carbs*f, lip:d.lip*f };
    }
    // ing.cuit : la quantite pesee l'a ete apres cuisson. On ramene au
    // poids cru, seul poids auquel se rapportent les valeurs de l'etiquette.
    const abs = ing.cuit ? (facteurCuisson(ing.name) || 1) : 1;
    const f = ((parseFloat(ing.portion)||0) / abs) / 100;
    return { kcal:d.kcal*f, prot:d.prot*f, carbs:d.carbs*f, lip:d.lip*f };
}

// Liste triee des noms pour la recherche
// Les entrees marquees cache:true restent resolubles (journaux et plats
// deja enregistres) mais n'apparaissent plus dans la recherche.
export const NOMS_ALIMENTS = Object.keys(DB).filter(n => !DB[n].cache).sort((a,b)=>a.localeCompare(b,'fr'));

// ============================================================
// DETAIL NUTRITIONNEL
// Fibres, sucres, graisses saturees et sel. Tous les aliments
// n'en disposent pas : la base interne ne porte que les macros,
// tandis que les produits scannes rapportent ce detail depuis
// Open Food Facts. On distingue donc « absent » de « zero ».
// ============================================================
export const CLES_DETAIL = ['fibres', 'sucres', 'satures', 'sel'];

/** Detail d'un ingredient, ramene a sa quantite. null si inconnu. */
export function detailOf(ing) {
  const d = DB[ing.name] || (window.__customFoods && window.__customFoods[ing.name]);
  if (!d) return null;
  const abs = (!d.unit && ing.cuit) ? (facteurCuisson(ing.name) || 1) : 1;
  const f = d.unit
    ? ((parseFloat(ing.portion) || 0) * d.unit) / 100
    : ((parseFloat(ing.portion) || 0) / abs) / 100;
  let renseigne = false;
  const out = {};
  for (const k of CLES_DETAIL) {
    if (d[k] == null) { out[k] = null; continue; }
    out[k] = d[k] * f;
    renseigne = true;
  }
  return renseigne ? out : null;
}

/**
 * Detail cumule d'une liste d'ingredients.
 * Renvoie aussi la couverture : combien d'aliments ont reellement
 * la donnee. Sans elle, un total calcule sur un seul aliment sur
 * cinq se lirait comme un total complet — donc comme un mensonge.
 */
export function detailTotal(ings) {
  const total = {};
  const connus = {};
  for (const k of CLES_DETAIL) { total[k] = 0; connus[k] = 0; }

  for (const ing of ings || []) {
    const d = detailOf(ing);
    if (!d) continue;
    for (const k of CLES_DETAIL) {
      if (d[k] == null) continue;
      total[k] += d[k];
      connus[k]++;
    }
  }
  return { total, connus, nbAliments: (ings || []).length };
}

// ============================================================
// RECHERCHE D'ALIMENTS
// La recherche par sous-chaine brute echouait des que l'ordre ou
// les liaisons differaient : « huile de colza » ne trouvait pas
// « Huile colza », « pate complete » ne trouvait pas « Pâtes
// completes ». On compare donc mot a mot, sans accents, sans
// liaisons, et sans distinguer singulier et pluriel.
// ============================================================

/** Minuscules, sans accents ni ponctuation. */
export function sansAccents(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Liaisons : elles varient d'une ecriture a l'autre sans rien changer
// au sens. « Huile de colza » et « Huile colza » designent la meme chose.
const LIAISONS = new Set(['de', 'du', 'des', 'd', 'a', 'au', 'aux', 'le', 'la', 'les', 'l', 'en', 'et']);

// Mots decrivant l'etat de preparation, pas une recette.
const ETATS_CUISSON = new Set([
  'cru', 'crue', 'cuit', 'cuite', 'grille', 'grillee', 'roti', 'rotie',
  'vapeur', 'bouilli', 'bouillie', 'sec', 'seche', 'frais', 'fraiche',
  'nature', 'entier', 'entiere',
]);

/** Singulier approximatif : « pates » et « pate » doivent se rejoindre. */
function racine(m) {
  if (m.length > 3 && m.endsWith('x')) return m.slice(0, -1);
  if (m.length > 3 && m.endsWith('s') && !m.endsWith('ss')) return m.slice(0, -1);
  return m;
}

export function motsCles(s) {
  return sansAccents(s).split(' ').filter(m => m && !LIAISONS.has(m)).map(racine);
}

/**
 * Score de correspondance entre une saisie et un nom d'aliment.
 * 0 = aucune correspondance. Plus le score est haut, plus le
 * resultat remonte : on privilegie ce qui commence par la saisie,
 * puis les noms courts, qui sont les aliments les plus generiques
 * (« Riz cru » avant « Riz cantonais rechauffe »).
 */
// Synonymes de recherche (04/10, Raci) : « patate » et « pdt » sont la
// pomme de terre ordinaire, pas seulement la patate douce.
function synonymes(s) {
  return String(s || '').toLowerCase()
    .replace(/\bpatates?\b(?!\s+douces?)/g, 'pomme de terre')
    .replace(/\bpdt\b/g, 'pomme de terre')
    // Anglais : « cream of rice » = creme de riz.
    .replace(/\bcream of rice\b/g, 'creme de riz')
    // « pates » seul : les pates alimentaires avant la pate a tartiner.
    .replace(/^\s*p[aâ]tes\s*$/, 'pâtes blanches');
}

export function scoreRecherche(saisie, nom) {
  saisie = synonymes(saisie);
  const req = motsCles(saisie);
  if (!req.length) return 0;
  const cible = sansAccents(nom);
  const dispo = motsCles(nom);

  let score = 0;
  for (const mot of req) {
    // Mot entier present : la correspondance la plus forte
    const exact = dispo.some(d => d === mot);
    // Debut de mot : « colz » trouve « colza », on suit la frappe
    const debut = !exact && dispo.some(d => d.startsWith(mot));
    // Ailleurs dans le nom : plus faible, mais utile sur les composes
    const dedans = !exact && !debut && cible.includes(mot);
    if (exact) score += 10;
    else if (debut) score += 6;
    else if (dedans) score += 2;
    else return 0;               // un mot demande manque : on ecarte
  }

  // Compare les racines (singulier) : « pommes de terre » ne doit pas
  // favoriser « Pommes de terre grenaille » face a « Pomme de terre ».
  const tout = req.join(' ');
  const cibleR = dispo.join(' ');
  if (cibleR === tout) score += 40;              // nom exact
  else if (cibleR.startsWith(tout)) score += 12; // commence par la saisie
  if (dispo.length === req.length) score += 6;  // aucun mot superflu

  // Aliment de base plutot que plat cuisine : quand les seuls mots en
  // trop decrivent la cuisson, on tient l'ingredient lui-meme. « Riz »
  // doit proposer « Riz cru » avant « Riz au lait ».
  const reste = dispo.filter(d => !req.includes(d));
  if (reste.length && reste.every(d => ETATS_CUISSON.has(d))) score += 5;

  // A egalite, le nom le plus court passe devant
  return score + Math.max(0, 12 - dispo.length) * 0.1;
}

// ============================================================
// CRU / CUIT — facteurs d'absorption
// L'etiquette d'un paquet donne les valeurs du produit tel qu'il
// est vendu, donc cru. Or on pese generalement son assiette apres
// cuisson. Sans correction, 200 g de pates cuites comptees comme
// crues font plus du double des calories reelles : c'est l'erreur
// de suivi la plus frequente.
//
// Le facteur est le rapport de poids cuit / cru : les feculents
// absorbent l'eau (les valeurs sont donc divisees d'autant pour
// 100 g), tandis que les viandes en perdent (facteur < 1, les
// valeurs augmentent au poids cuit).
// ============================================================

export const FACTEURS_CUISSON = [
  { cle: 'pates',    facteur: 2.4, mots: ['pate', 'spaghetti', 'macaroni', 'penne', 'tagliatelle', 'fusilli', 'coquillette', 'nouille', 'lasagne', 'vermicelle'] },
  { cle: 'riz',      facteur: 2.7, mots: ['riz', 'risotto'] },
  { cle: 'semoule',  facteur: 2.5, mots: ['semoule', 'couscous', 'boulgour', 'quinoa', 'ebly'] },
  { cle: 'legumsec', facteur: 2.4, mots: ['lentille', 'pois', 'chiche', 'haricot', 'flageolet', 'feve'] },
  { cle: 'avoine',   facteur: 3.0, mots: ['avoine', 'flocon', 'porridge'] },
  { cle: 'viande',   facteur: 0.7, mots: ['poulet', 'dinde', 'boeuf', 'porc', 'veau', 'agneau', 'steak', 'escalope', 'filet', 'saumon', 'cabillaud', 'thon', 'colin', 'merlu', 'crevette'] },
  // « terre » plutot que « pomme » : la pomme fruit ne doit pas heriter
  // de la bascule. 0.9 = le rapport des propres paires de la base
  // (77 kcal crue -> 87 kcal cuite a l'eau).
  { cle: 'pdt',      facteur: 0.9, mots: ['terre', 'patate', 'grenaille'] },
];

// Preparations deja cuisinees : leurs valeurs valent pour le produit
// fini, la bascule cru/cuit n'y a aucun sens (puree, frites, sautees...).
const PREPARATIONS = new Set(['puree', 'croquette', 'sautee', 'rissolee', 'frite', 'mousline', 'chips', 'rosti', 'gratin', 'dauphinois']);

/**
 * Facteur de cuisson devine a partir du nom, ou null si l'aliment
 * ne s'y prete pas (huile, fromage, fruit...). On ne propose la
 * bascule que lorsqu'elle a un sens.
 */
// ============================================================
// PAIRES CRU / CUIT
// 143 aliments portent deja leur cuisson dans leur nom, dont 40 en
// paire complete (« Riz basmati cru » / « Riz basmati (cuit) »).
// Ceux-la se voyaient refuser la bascule : leur nom disait la
// cuisson, donc plus rien a convertir. Resultat, un utilisateur qui
// avait choisi la mauvaise entree devait la supprimer et
// recommencer. La bascule change desormais d'entree — valeurs
// exactes de la base, aucun facteur devine.
// ============================================================
const SANS_CUISSON = (n) => n
  .replace(/\s*\((cuit|cuite|cuits|cuites|cru|crue|crus)\)/gi, '')
  .replace(/\s+(cuit|cuite|cuits|cuites|cru|crue|crus)\b/gi, '')
  .trim();
const EST_CUIT = (n) => /\bcuit/i.test(n);

export const PAIRES_CUISSON = (() => {
  const par = {};
  for (const n of Object.keys(DB)) {
    // Les entrees masquees restent resolubles pour les journaux deja
    // enregistres, mais la bascule ne doit jamais y renvoyer : on
    // basculerait vers un aliment introuvable a la recherche.
    if (DB[n].cache) continue;
    const base = SANS_CUISSON(n);
    if (base === n) continue;
    (par[base] = par[base] || []).push(n);
  }
  const out = {};
  for (const noms of Object.values(par)) {
    const cru = noms.find(n => !EST_CUIT(n));
    const cuit = noms.find(n => EST_CUIT(n));
    if (!cru || !cuit) continue;
    out[cru] = { autre: cuit, cuit: false };
    out[cuit] = { autre: cru, cuit: true };
  }
  return out;
})();

export function facteurCuisson(nom) {
  const mots = motsCles(nom);
  // Deja precise dans le nom : l'aliment porte sa propre valeur,
  // aucune conversion a proposer.
  if (mots.some(m => ['cru', 'crue', 'cuit', 'cuite'].includes(m))) return null;
  if (mots.some(m => PREPARATIONS.has(m))) return null;
  // Poudre a delayer : on pese la poudre seche, pas la bouillie.
  if (mots.includes('creme') && mots.includes('riz')) return null;
  for (const f of FACTEURS_CUISSON) {
    // Mots de moins de 3 lettres exclus du rapprochement : la taille
    // « M » d'un oeuf faisait demarrer « macaroni », d'ou une bascule
    // cru/cuit au facteur PATES (x2.4) sur les oeufs.
    if (mots.some(m => m.length >= 3 && f.mots.some(x => m.startsWith(x) || x.startsWith(m)))) return f.facteur;
  }
  return null;
}
