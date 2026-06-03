// Cuisine catalog drives both the form chooser and per-card color theming.
// New cuisine? Add it here — the helpers below pick up the new entry
// automatically (color/emoji/label all live in one place).
export const CUISINES = [
  { value: 'italiana',     label: 'Italiana',     emoji: '🍝', color: '#E83E5C' },
  { value: 'japonesa',     label: 'Japonesa',     emoji: '🍣', color: '#FF8FB1' },
  { value: 'mexicana',     label: 'Mexicana',     emoji: '🌮', color: '#3FBF6A' },
  { value: 'asiatica',     label: 'Asiática',     emoji: '🥡', color: '#F2A23A' },
  { value: 'india',        label: 'India',        emoji: '🍛', color: '#FF7A3A' },
  { value: 'espanola',     label: 'Española',     emoji: '🥘', color: '#F2C53A' },
  { value: 'mediterranea', label: 'Mediterránea', emoji: '🫒', color: '#7FB069' },
  { value: 'americana',    label: 'Americana',    emoji: '🍔', color: '#D6593C' },
  { value: 'brunch',       label: 'Brunch',       emoji: '🥞', color: '#F4B860' },
  { value: 'parrilla',     label: 'Parrilla',     emoji: '🥩', color: '#B33A48' },
  { value: 'vegetariana',  label: 'Vegetariana',  emoji: '🥗', color: '#5DBB63' },
  { value: 'postres',      label: 'Postres',      emoji: '🍰', color: '#F08CA8' },
  { value: 'cafe',         label: 'Café',         emoji: '☕', color: '#9B5A3C' },
  { value: 'fusion',       label: 'Fusión',       emoji: '🍱', color: '#7E5CD7' },
  { value: 'otros',        label: 'Otros',        emoji: '🍽️', color: '#6B7280' },
] as const;

export type CuisineValue = (typeof CUISINES)[number]['value'];

export const PRICE_TIERS = ['€', '€€', '€€€', '€€€€'] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export type RestaurantStatus = 'wishlist' | 'visited';
export type AddedBy = 'MK' | 'Xabi';

export interface Restaurant {
  id: string;
  name: string;
  cuisine: CuisineValue | null;
  location: string | null;
  status: RestaurantStatus;
  added_by: AddedBy | null;
  rating: number | null;
  price_tier: PriceTier | null;
  notes: string | null;
  visited_at: string | null; // YYYY-MM-DD
  // Optional Google Places attributes — null for manual entries.
  image_url: string | null;
  google_place_id: string | null;
  maps_url: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

// Map Google Places "primary type" to our CUISINES catalog. Falls back to
// "otros" so the chip stays valid.
const PLACES_TYPE_TO_CUISINE: Record<string, CuisineValue> = {
  italian_restaurant: 'italiana',
  pizza_restaurant: 'italiana',
  japanese_restaurant: 'japonesa',
  sushi_restaurant: 'japonesa',
  ramen_restaurant: 'japonesa',
  mexican_restaurant: 'mexicana',
  taco_restaurant: 'mexicana',
  chinese_restaurant: 'asiatica',
  thai_restaurant: 'asiatica',
  vietnamese_restaurant: 'asiatica',
  korean_restaurant: 'asiatica',
  asian_restaurant: 'asiatica',
  indian_restaurant: 'india',
  spanish_restaurant: 'espanola',
  tapas_bar: 'espanola',
  mediterranean_restaurant: 'mediterranea',
  greek_restaurant: 'mediterranea',
  lebanese_restaurant: 'mediterranea',
  middle_eastern_restaurant: 'mediterranea',
  american_restaurant: 'americana',
  hamburger_restaurant: 'americana',
  breakfast_restaurant: 'brunch',
  brunch_restaurant: 'brunch',
  steak_house: 'parrilla',
  barbecue_restaurant: 'parrilla',
  brazilian_restaurant: 'parrilla',
  argentinian_restaurant: 'parrilla',
  vegetarian_restaurant: 'vegetariana',
  vegan_restaurant: 'vegetariana',
  dessert_restaurant: 'postres',
  ice_cream_shop: 'postres',
  bakery: 'postres',
  cafe: 'cafe',
  coffee_shop: 'cafe',
  fusion_restaurant: 'fusion',
};

export function cuisineFromPlacesTypes(types: string[] | null | undefined): CuisineValue | null {
  if (!types || types.length === 0) return null;
  for (const t of types) {
    const v = PLACES_TYPE_TO_CUISINE[t];
    if (v) return v;
  }
  return null;
}

// Google PRICE_LEVEL_* enum → our '€'/'€€'/'€€€'/'€€€€' tiers.
export function priceTierFromGoogle(level: string | null | undefined): PriceTier | null {
  switch (level) {
    case 'PRICE_LEVEL_INEXPENSIVE':    return '€';
    case 'PRICE_LEVEL_MODERATE':       return '€€';
    case 'PRICE_LEVEL_EXPENSIVE':      return '€€€';
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '€€€€';
    default: return null;
  }
}

export function cuisineMeta(value: string | null) {
  if (!value) return CUISINES[CUISINES.length - 1]; // "otros"
  return CUISINES.find((c) => c.value === value) ?? CUISINES[CUISINES.length - 1];
}

export function formatVisitedAt(d: string | null): string {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
