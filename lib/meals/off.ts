// OpenFoodFacts helpers. The API needs no key.

import type { Aisle } from '@/lib/meals/recipes';

// Map OFF category tags → our supermarket aisle. Order matters — first
// match wins, so put narrower tags first. OFF tags use the form
// `<lang>:<slug>` (e.g. `en:dairies`, `es:lacteos`).
const TAG_TO_AISLE: { match: RegExp; aisle: Aisle }[] = [
  { match: /:meats$|:meat$|:beef|:pork|:chicken|:carnes|:embutidos/, aisle: 'carniceria' },
  { match: /:seafood$|:fishes|:fish-and-seafood|:pescados|:mariscos/, aisle: 'pescaderia' },
  { match: /:dairies$|:dairy|:cheeses|:yogurts|:milks|:lacteos|:quesos|:yogures/, aisle: 'lacteos' },
  { match: /:fruits|:vegetables|:legumes|:frutas|:verduras|:hortalizas/, aisle: 'frutas_verduras' },
  { match: /:breads$|:breakfast-cereals$|:viennoiseries|:panes|:bolleria/, aisle: 'panaderia' },
  { match: /:frozen|:ice-creams|:congelados|:helados/, aisle: 'congelados' },
  { match: /:beverages|:waters|:juices|:soft-drinks|:beers|:wines|:bebidas|:zumos|:vinos|:cervezas/, aisle: 'bebidas' },
  { match: /:detergents|:cleaning|:limpieza|:hygiene|:higiene/, aisle: 'limpieza' },
];

export function aisleFromOffCategories(categoriesTags: string[] | null | undefined): Aisle {
  if (!categoriesTags || categoriesTags.length === 0) return 'despensa';
  for (const tag of categoriesTags) {
    for (const { match, aisle } of TAG_TO_AISLE) {
      if (match.test(tag)) return aisle;
    }
  }
  return 'despensa';
}

// Strip OFF brand suffixes like "Hacendado - Mercadona" and lowercase the
// resulting display name (matches how the pantry stores names — lowercase
// for dedupe + search consistency).
export function normaliseOffProductName(input: string): string {
  return input
    .replace(/\s*[-–|]\s*(mercadona|carrefour|dia|alcampo|lidl|aldi).*$/i, '')
    .trim()
    .toLowerCase();
}
