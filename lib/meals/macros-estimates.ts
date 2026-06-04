// Per-100g rough nutrition estimates by category. Used as a last-resort
// fallback when OpenFoodFacts doesn't have an EAN. Numbers come from
// USDA/EU averages of common items in each Mercadona category — they're
// **approximate** and ALWAYS surfaced with macros_source='estimate' so
// the UI can warn the user.

export interface Macros {
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
}

// Match keys against the lowercase leaf or top category from Mercadona.
// First match wins, so put narrower keys before broader ones.
const TABLE: { match: RegExp; macros: Macros }[] = [
  // Fruta y verdura
  { match: /lechuga|ensalada|espinaca|rúcula|berros|canónigos/, macros: { kcal_100g: 18,  protein_100g: 1.4, carbs_100g: 2.9, fat_100g: 0.2 } },
  { match: /tomate|pepino|pimiento|calabacín|berenjena|brocoli|coliflor|judía|alcachofa/, macros: { kcal_100g: 24, protein_100g: 1.2, carbs_100g: 4.5, fat_100g: 0.3 } },
  { match: /fruta|manzana|naranja|pera|plátano|fresa|kiwi|piña|mango/, macros: { kcal_100g: 55, protein_100g: 0.8, carbs_100g: 13.5, fat_100g: 0.3 } },
  { match: /aguacate/, macros: { kcal_100g: 160, protein_100g: 2,   carbs_100g: 8.5,  fat_100g: 15 } },
  { match: /aceitun/, macros: { kcal_100g: 145, protein_100g: 1,   carbs_100g: 6,    fat_100g: 13.5 } },
  { match: /patata/, macros: { kcal_100g: 77,  protein_100g: 2,   carbs_100g: 17,   fat_100g: 0.1 } },
  { match: /champi|seta|setas/, macros: { kcal_100g: 22, protein_100g: 3,   carbs_100g: 3,    fat_100g: 0.3 } },
  { match: /fruta y verdura|hortaliz|legumbre/, macros: { kcal_100g: 35, protein_100g: 1.5, carbs_100g: 6, fat_100g: 0.3 } },

  // Pescado
  { match: /salmón|atún|caballa|sardina|trucha/, macros: { kcal_100g: 200, protein_100g: 22, carbs_100g: 0, fat_100g: 13 } },
  { match: /merluza|bacalao|lubina|dorada|pescado blanco/, macros: { kcal_100g: 90,  protein_100g: 20, carbs_100g: 0, fat_100g: 1 } },
  { match: /pescado|gambas|langostino|marisco|calamar|pulpo/, macros: { kcal_100g: 110, protein_100g: 21, carbs_100g: 0, fat_100g: 3 } },

  // Carnes y embutidos
  { match: /pollo|pavo/, macros: { kcal_100g: 160, protein_100g: 27, carbs_100g: 0, fat_100g: 5 } },
  { match: /ternera|vacuno|buey/, macros: { kcal_100g: 230, protein_100g: 25, carbs_100g: 0, fat_100g: 14 } },
  { match: /cerdo/, macros: { kcal_100g: 240, protein_100g: 24, carbs_100g: 0, fat_100g: 16 } },
  { match: /jamón|chorizo|salchichón|embutido|fuet|salami/, macros: { kcal_100g: 330, protein_100g: 25, carbs_100g: 1, fat_100g: 26 } },
  { match: /bacon|panceta/, macros: { kcal_100g: 540, protein_100g: 12, carbs_100g: 0, fat_100g: 55 } },
  { match: /hamburguesa|albóndiga/, macros: { kcal_100g: 250, protein_100g: 20, carbs_100g: 2, fat_100g: 18 } },
  { match: /carne|carnicería/, macros: { kcal_100g: 200, protein_100g: 22, carbs_100g: 0, fat_100g: 12 } },

  // Lácteos y derivados
  { match: /yogur griego|skyr/, macros: { kcal_100g: 100, protein_100g: 9,   carbs_100g: 4,   fat_100g: 5 } },
  { match: /yogur/, macros: { kcal_100g: 70,  protein_100g: 4,   carbs_100g: 7,   fat_100g: 3 } },
  { match: /queso curado|manchego/, macros: { kcal_100g: 380, protein_100g: 25, carbs_100g: 1, fat_100g: 30 } },
  { match: /queso fresco|burgos|mozzarella|requesón/, macros: { kcal_100g: 200, protein_100g: 15, carbs_100g: 3, fat_100g: 15 } },
  { match: /queso/, macros: { kcal_100g: 340, protein_100g: 22, carbs_100g: 2, fat_100g: 27 } },
  { match: /leche entera/, macros: { kcal_100g: 65,  protein_100g: 3.4, carbs_100g: 4.8, fat_100g: 3.6 } },
  { match: /leche desnatada/, macros: { kcal_100g: 36,  protein_100g: 3.4, carbs_100g: 5,   fat_100g: 0.1 } },
  { match: /leche/, macros: { kcal_100g: 52, protein_100g: 3.4, carbs_100g: 4.8, fat_100g: 2.5 } },
  { match: /nata|crema/, macros: { kcal_100g: 290, protein_100g: 2.5, carbs_100g: 3, fat_100g: 30 } },
  { match: /mantequilla/, macros: { kcal_100g: 720, protein_100g: 0.6, carbs_100g: 0.6, fat_100g: 81 } },
  { match: /huevo/, macros: { kcal_100g: 145, protein_100g: 13, carbs_100g: 0.7, fat_100g: 10 } },
  { match: /lácteo|dairy/, macros: { kcal_100g: 100, protein_100g: 5, carbs_100g: 6, fat_100g: 6 } },

  // Cereales / pan / pasta
  { match: /pan integral/, macros: { kcal_100g: 240, protein_100g: 8,  carbs_100g: 41, fat_100g: 3 } },
  { match: /pan|tostadas|biscote/, macros: { kcal_100g: 270, protein_100g: 9,  carbs_100g: 50, fat_100g: 2.5 } },
  { match: /pasta|espagueti|macarrones|fideos/, macros: { kcal_100g: 360, protein_100g: 12, carbs_100g: 73, fat_100g: 1.5 } },
  { match: /arroz/, macros: { kcal_100g: 350, protein_100g: 7,  carbs_100g: 78, fat_100g: 0.6 } },
  { match: /cereales|granola|muesli|avena/, macros: { kcal_100g: 380, protein_100g: 12, carbs_100g: 65, fat_100g: 7 } },
  { match: /galleta|bollería|magdalena|croissant/, macros: { kcal_100g: 460, protein_100g: 6, carbs_100g: 60, fat_100g: 22 } },

  // Legumbres
  { match: /lenteja|garbanzo|judías secas|alubias/, macros: { kcal_100g: 120, protein_100g: 8, carbs_100g: 20, fat_100g: 1 } },

  // Snacks
  { match: /patatas fritas|frutos secos|cacahuete|almendra|nueces|pistacho/, macros: { kcal_100g: 580, protein_100g: 20, carbs_100g: 18, fat_100g: 50 } },
  { match: /chocolate/, macros: { kcal_100g: 540, protein_100g: 5, carbs_100g: 55, fat_100g: 32 } },

  // Bebidas
  { match: /agua/, macros: { kcal_100g: 0, protein_100g: 0, carbs_100g: 0, fat_100g: 0 } },
  { match: /refresco|cola|gaseosa|zumo|néctar/, macros: { kcal_100g: 42, protein_100g: 0, carbs_100g: 10.5, fat_100g: 0 } },
  { match: /cerveza/, macros: { kcal_100g: 43, protein_100g: 0.5, carbs_100g: 3.6, fat_100g: 0 } },
  { match: /vino/, macros: { kcal_100g: 83, protein_100g: 0.1, carbs_100g: 2.6, fat_100g: 0 } },
  { match: /infusión|café/, macros: { kcal_100g: 2,  protein_100g: 0.1, carbs_100g: 0, fat_100g: 0 } },
  { match: /bebida|refresc/, macros: { kcal_100g: 35, protein_100g: 0, carbs_100g: 8, fat_100g: 0 } },

  // Aceites / condimentos
  { match: /aceite/, macros: { kcal_100g: 900, protein_100g: 0, carbs_100g: 0, fat_100g: 100 } },
  { match: /sal|especi|condiment|vinagre|salsa/, macros: { kcal_100g: 30, protein_100g: 1, carbs_100g: 6, fat_100g: 0.5 } },
  { match: /azúcar|miel|mermelada/, macros: { kcal_100g: 380, protein_100g: 0.2, carbs_100g: 95, fat_100g: 0 } },

  // Congelados (generic)
  { match: /pizza/, macros: { kcal_100g: 260, protein_100g: 11, carbs_100g: 30, fat_100g: 10 } },
  { match: /helado/, macros: { kcal_100g: 220, protein_100g: 4, carbs_100g: 25, fat_100g: 11 } },
];

const FALLBACK: Macros = { kcal_100g: 150, protein_100g: 5, carbs_100g: 20, fat_100g: 5 };

export function estimateMacros(opts: {
  name?: string | null;
  categoryTop?: string | null;
  categoryLeaf?: string | null;
}): Macros {
  const haystack = [opts.categoryLeaf, opts.categoryTop, opts.name]
    .filter((s): s is string => Boolean(s))
    .map((s) => s.toLowerCase())
    .join(' ');
  for (const { match, macros } of TABLE) {
    if (match.test(haystack)) return macros;
  }
  return FALLBACK;
}
