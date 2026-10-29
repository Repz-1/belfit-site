// Idees repas BelFit — extraites d'app.html (copie exacte).
// Chaque idee est composee d'aliments reels de la base : macros calculees exactement.
// n = cle DB, q = grammes (ou nombre d'unites), l = libelle court
export const EAT_IDEAS = {
    // Chaque idée est composée d'aliments réels de la base : kcal/prot calculées exactement
    // n = clé DB, q = grammes (ou nombre d'unités si l'aliment est à l'unité), l = libellé court
    sain: [
        { nom:'Blanc de poulet + riz + légumes', ings:[{n:'Poulet cuit',q:150,l:'poulet cuit'},{n:'Riz cuit',q:150,l:'riz cuit'},{n:'Brocoli',q:150,l:'brocoli'}] },
        { nom:'Saumon + patate douce', ings:[{n:'Saumon cuit',q:130,l:'saumon cuit'},{n:'Patate douce (cuite)',q:250,l:'patate douce cuite'}] },
        { nom:'Omelette + salade + pain complet', ings:[{n:'Oeuf entier M (50g)',q:3,l:'œuf'},{n:'Salade verte',q:80,l:'salade'},{n:'Pain complet',q:60,l:'pain complet'}] },
        { nom:'Bowl thon + quinoa', ings:[{n:'Thon naturel boite',q:140,l:'thon'},{n:'Quinoa (cuit)',q:185,l:'quinoa cuit'},{n:'Tomate',q:100,l:'tomate'}] },
        { nom:'Steak haché 5% + pommes de terre + légumes', ings:[{n:'Boeuf hache 5% cuit',q:150,l:'steak 5% cuit'},{n:'Pomme de terre cuite',q:250,l:'pommes de terre cuite'},{n:'Haricots verts',q:150,l:'haricots verts'}] },
        { nom:'Poulet + patate douce + brocoli', ings:[{n:'Poulet cuit',q:150,l:'poulet cuit'},{n:'Patate douce',q:200,l:'patate douce'},{n:'Brocoli',q:150,l:'brocoli'}] },
        { nom:'Dinde + quinoa + courgette', ings:[{n:'Dinde escalope cuite',q:130,l:'dinde cuite'},{n:'Quinoa cru',q:60,l:'quinoa cru'},{n:'Courgette',q:150,l:'courgette'}] },
        { nom:'Saumon + riz + épinards', ings:[{n:'Saumon cuit',q:130,l:'saumon cuit'},{n:'Riz cuit',q:150,l:'riz cuit'},{n:'Épinards',q:100,l:'épinards'}] },
        { nom:'Crevettes + boulgour + poivron', ings:[{n:'Crevettes',q:150,l:'crevettes'},{n:'Boulgour cru',q:60,l:'boulgour cru'},{n:'Poivron',q:100,l:'poivron'}] },
        { nom:'Skyr + myrtilles + amandes', ings:[{n:'Skyr',q:200,l:'skyr'},{n:'Myrtilles',q:80,l:'myrtilles'},{n:'Amandes',q:20,l:'amandes'}] }
    ],
    rapide: [
        { nom:'Thon + riz + maïs + légumes', ings:[{n:'Thon naturel boite',q:140,l:'thon'},{n:'Riz cuit',q:200,l:'riz cuit'},{n:'Maïs',q:80,l:'maïs'},{n:'Tomate',q:80,l:'tomate'}] },
        { nom:'Bol fromage blanc + whey + avoine + amandes', ings:[{n:'Fromage blanc 0%',q:300,l:'fromage blanc 0%'},{n:'Whey',q:20,l:'whey'},{n:'Avoine',q:30,l:'avoine'},{n:'Amandes',q:15,l:'amandes'}] },
        { nom:'Œufs brouillés + pain complet + fromage', ings:[{n:'Oeuf entier M (50g)',q:3,l:'œuf'},{n:'Pain complet',q:60,l:'pain complet'},{n:'Cheddar',q:20,l:'cheddar'}] },
        { nom:'Skyr + avoine + beurre cacahuète + banane', ings:[{n:'Skyr',q:350,l:'skyr'},{n:'Avoine',q:40,l:'avoine'},{n:'Beurre cacahuète',q:15,l:'beurre cacahuète'},{n:'Banane',q:120,l:'banane'}] },
        { nom:'Wrap thon + crudités', ings:[{n:'Wrap/Tortilla',q:60,l:'tortilla'},{n:'Thon naturel boite',q:140,l:'thon'},{n:'Tomate',q:80,l:'tomate'},{n:'Salade verte',q:40,l:'salade'}] },
        { nom:'Thon + pâtes + tomate', ings:[{n:'Thon naturel boite',q:100,l:'thon'},{n:'Pâtes blanches cuites',q:200,l:'pâtes cuites'},{n:'Tomate',q:100,l:'tomate'}] },
        { nom:'Jambon de dinde + œufs + pain complet', ings:[{n:'Jambon de dinde',q:60,l:'jambon de dinde'},{n:'Oeuf entier M (50g)',q:2,l:'œuf'},{n:'Pain complet',q:60,l:'pain complet'}] },
        { nom:'Wrap poulet crudités', ings:[{n:'Wrap/Tortilla',q:60,l:'tortilla'},{n:'Poulet cuit',q:100,l:'poulet cuit'},{n:'Tomate',q:50,l:'tomate'}] },
        { nom:'Fromage blanc + avoine + banane', ings:[{n:'Fromage blanc 0%',q:250,l:'fromage blanc'},{n:'Flocons avoine',q:40,l:'avoine'},{n:'Banane',q:100,l:'banane'}] },
        { nom:'Galettes de riz + beurre cacahuète + banane', ings:[{n:'Galette de riz',q:30,l:'galettes de riz'},{n:'Beurre cacahuète',q:20,l:'beurre cacahuète'},{n:'Banane',q:100,l:'banane'}] }
    ],
    plaisir: [
        { nom:'Pâtes bolognaise (riche en viande)', ings:[{n:'Pâtes blanches cuites',q:220,l:'pâtes cuites'},{n:'Boeuf hache 15% cuit',q:120,l:'bœuf haché 15% cuit'},{n:'Sauce tomate',q:100,l:'sauce tomate'}] },
        { nom:'Burger maison au steak', ings:[{n:'Pain hamburger',q:65,l:'pain burger'},{n:'Boeuf hache 15% cuit',q:130,l:'bœuf haché 15% cuit'},{n:'Cheddar',q:25,l:'cheddar'},{n:'Tomate',q:50,l:'tomate'},{n:'Salade verte',q:30,l:'salade'}] },
        { nom:'Wrap poulet fromage', ings:[{n:'Wrap/Tortilla',q:60,l:'tortilla'},{n:'Poulet cuit',q:120,l:'poulet cuit'},{n:'Cheddar',q:20,l:'cheddar'},{n:'Salade verte',q:40,l:'salade'}] },
        { nom:'Riz cantonais poulet + œuf', ings:[{n:'Riz cantonais',q:250,l:'riz cantonais'},{n:'Poulet cuit',q:100,l:'poulet cuit'},{n:'Oeuf entier M (50g)',q:1,l:'œuf'}] },
        { nom:'Chili con carne', ings:[{n:'Boeuf hache 5% cuit',q:150,l:'bœuf haché 5% cuit'},{n:'Haricots rouges (cuits)',q:150,l:'haricots rouges cuits'},{n:'Riz cuit',q:150,l:'riz cuit'},{n:'Sauce tomate',q:80,l:'sauce tomate'}] },
        { nom:'Pâtes bolognaise dinde', ings:[{n:'Dinde hachée cuite',q:150,l:'dinde hachée cuite'},{n:'Pâtes blanches cuites',q:200,l:'pâtes cuites'},{n:'Tomate',q:80,l:'tomate'}] },
        { nom:'Wrap poulet mozzarella', ings:[{n:'Wrap/Tortilla',q:60,l:'tortilla'},{n:'Poulet cuit',q:120,l:'poulet cuit'},{n:'Mozzarella',q:40,l:'mozzarella'}] },
        { nom:'Riz sauté crevettes + œuf', ings:[{n:'Riz cuit',q:200,l:'riz cuit'},{n:'Crevettes',q:100,l:'crevettes'},{n:'Oeuf entier M (50g)',q:1,l:'œuf'}] },
        { nom:'Burger dinde maison', ings:[{n:'Pain blanc',q:80,l:'pain'},{n:'Dinde hachée cuite',q:130,l:'dinde hachée cuite'},{n:'Mozzarella',q:30,l:'mozzarella'}] },
        { nom:'Bowl saumon fumé + riz', ings:[{n:'Saumon fume',q:80,l:'saumon fumé'},{n:'Riz cuit',q:200,l:'riz cuit'},{n:'Tomate',q:60,l:'tomate'}] }
    ],
    vege: [
        { nom:'Buddha bowl pois chiches', ings:[{n:'Pois chiches (cuits)',q:200,l:'pois chiches cuits'},{n:'Quinoa (cuit)',q:150,l:'quinoa cuit'},{n:'Courgette',q:150,l:'courgette'}] },
        { nom:'Tofu brouillé + pain complet + avocat', ings:[{n:'Tofu',q:200,l:'tofu'},{n:'Pain complet',q:60,l:'pain complet'},{n:'Avocat',q:50,l:'avocat'}] },
        { nom:'Lentilles + œufs + légumes', ings:[{n:'Lentilles (cuites)',q:200,l:'lentilles cuites'},{n:'Oeuf entier M (50g)',q:2,l:'œuf'},{n:'Épinards frais',q:100,l:'épinards'}] },
        { nom:'Dahl lentilles corail + riz', ings:[{n:'Lentilles corail',q:200,l:'lentilles corail'},{n:'Riz cuit',q:150,l:'riz cuit'},{n:'Lait de coco',q:50,l:'lait de coco'}] },
        { nom:'Omelette feta + épinards + pain', ings:[{n:'Oeuf entier M (50g)',q:3,l:'œuf'},{n:'Feta',q:40,l:'feta'},{n:'Épinards frais',q:80,l:'épinards'},{n:'Pain complet',q:50,l:'pain complet'}] },
        { nom:'Tofu + riz + brocoli', ings:[{n:'Tofu',q:150,l:'tofu'},{n:'Riz cuit',q:150,l:'riz cuit'},{n:'Brocoli',q:150,l:'brocoli'}] },
        { nom:'Pois chiches + riz + épinards', ings:[{n:'Pois chiches cuits',q:200,l:'pois chiches cuits'},{n:'Riz cuit',q:150,l:'riz cuit'},{n:'Épinards',q:80,l:'épinards'}] },
        { nom:'Œufs + haricots rouges + tomate', ings:[{n:'Oeuf entier M (50g)',q:3,l:'œuf'},{n:'Haricots rouges',q:150,l:'haricots rouges'},{n:'Tomate',q:80,l:'tomate'}] },
        { nom:'Poêlée haricots noirs + patate douce + œuf', ings:[{n:'Haricots noirs',q:150,l:'haricots noirs'},{n:'Patate douce (cuite)',q:200,l:'patate douce cuite'},{n:'Oeuf entier M (50g)',q:2,l:'œuf'}] },
        { nom:'Fromage blanc + avoine + amandes + miel', ings:[{n:'Fromage blanc 0%',q:250,l:'fromage blanc'},{n:'Flocons avoine',q:40,l:'avoine'},{n:'Amandes',q:15,l:'amandes'},{n:'Miel',q:15,l:'miel'}] }
    ]
};

// Libelles repris de la reference : pas d'emoji, texte seul.
export const CATEGORIES_IDEES = [
  { k: 'sain',    label: 'Sain & léger' },
  { k: 'rapide',  label: 'Rapide' },
  { k: 'plaisir', label: 'Plaisir' },
  { k: 'vege',    label: 'Végé' },
].filter(c => EAT_IDEAS[c.k] && EAT_IDEAS[c.k].length);

// 29/10 Raci : idees du PETIT-DEJEUNER, seules proposees par « Autre idee »
// sur ce creneau. Jamais de plat du soir (pates bolognaise, poulet-riz...).
// Ingredients autorises par Raci : oeufs, lait, fromage light / 0 %, avoine,
// creme de riz, riz basmati, pain complet cereales, pain blanc, plus les
// produits typiques du matin (skyr, yaourt, fruits, beurre de cacahuete,
// confiture, miel, whey). Aucune viande ni poisson : vegetarien par nature.
export const IDEES_PETIT_DEJ = [
  { nom:'Porridge avoine + lait + banane', ings:[{n:'Flocons avoine',q:60,l:'avoine'},{n:'Lait 1/2 écrémé',q:250,l:'lait demi-écrémé'},{n:'Banane',q:100,l:'banane'}] },
  { nom:'Porridge avoine + skyr + myrtilles + miel', ings:[{n:'Flocons avoine',q:50,l:'avoine'},{n:'Skyr',q:200,l:'skyr'},{n:'Myrtilles',q:80,l:'myrtilles'},{n:'Miel',q:10,l:'miel'}] },
  { nom:'Crème de riz + lait + beurre de cacahuète', ings:[{n:'Crème de riz',q:60,l:'crème de riz'},{n:'Lait 1/2 écrémé',q:200,l:'lait demi-écrémé'},{n:'Beurre cacahuète',q:15,l:'beurre de cacahuète'}] },
  { nom:'Crème de riz + whey + fruits rouges', ings:[{n:'Crème de riz',q:60,l:'crème de riz'},{n:'Whey',q:25,l:'whey'},{n:'Framboises',q:100,l:'framboises'}] },
  { nom:'Omelette + pain complet aux céréales', ings:[{n:'Oeuf entier M (50g)',q:3,l:'œuf'},{n:'Pain aux céréales',q:70,l:'pain complet aux céréales'}] },
  { nom:'Œufs brouillés + pain blanc + kiwi', ings:[{n:'Oeuf entier M (50g)',q:2,l:'œuf'},{n:'Pain blanc',q:70,l:'pain blanc'},{n:'Kiwi',q:100,l:'kiwi'}] },
  { nom:'Tartines fromage blanc 0% + confiture', ings:[{n:'Pain aux céréales',q:80,l:'pain complet aux céréales'},{n:'Fromage blanc 0%',q:150,l:'fromage blanc 0%'},{n:'Confiture',q:20,l:'confiture'}] },
  { nom:'Tartines beurre de cacahuète + banane', ings:[{n:'Pain complet',q:70,l:'pain complet'},{n:'Beurre cacahuète',q:20,l:'beurre de cacahuète'},{n:'Banane',q:100,l:'banane'}] },
  { nom:'Pancakes avoine + œufs + myrtilles', ings:[{n:'Flocons avoine',q:50,l:'avoine'},{n:'Oeuf entier M (50g)',q:2,l:'œuf'},{n:'Lait 1/2 écrémé',q:100,l:'lait demi-écrémé'},{n:'Myrtilles',q:80,l:'myrtilles'}] },
  { nom:'Riz au lait basmati + miel + pomme', ings:[{n:'Riz basmati (cuit)',q:150,l:'riz basmati cuit'},{n:'Lait 1/2 écrémé',q:200,l:'lait demi-écrémé'},{n:'Miel',q:10,l:'miel'},{n:'Pomme',q:120,l:'pomme'}] },
  { nom:'Skyr + avoine + fraises', ings:[{n:'Skyr',q:250,l:'skyr'},{n:'Flocons avoine',q:40,l:'avoine'},{n:'Fraises',q:120,l:'fraises'}] },
  { nom:'Fromage blanc 0% + avoine + banane', ings:[{n:'Fromage blanc 0%',q:250,l:'fromage blanc 0%'},{n:'Flocons avoine',q:40,l:'avoine'},{n:'Banane',q:100,l:'banane'}] },
  { nom:'Yaourt grec 0% + granola + framboises', ings:[{n:'Yaourt grec 0%',q:200,l:'yaourt grec 0%'},{n:'Granola',q:40,l:'granola'},{n:'Framboises',q:80,l:'framboises'}] },
  { nom:'Œufs + pain blanc + mozzarella light', ings:[{n:'Oeuf entier M (50g)',q:2,l:'œuf'},{n:'Pain blanc',q:60,l:'pain blanc'},{n:'Mozzarella light',q:30,l:'mozzarella light'}] },
  { nom:'Cottage cheese + pain complet + pomme', ings:[{n:'Cottage cheese',q:150,l:'cottage cheese'},{n:'Pain complet',q:70,l:'pain complet'},{n:'Pomme',q:120,l:'pomme'}] },
  { nom:'Overnight oats lait + miel + banane', ings:[{n:'Flocons avoine',q:60,l:'avoine'},{n:'Lait 1/2 écrémé',q:200,l:'lait demi-écrémé'},{n:'Miel',q:10,l:'miel'},{n:'Banane',q:80,l:'banane'}] },
];
