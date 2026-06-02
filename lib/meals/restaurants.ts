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
  created_at: string;
  updated_at: string;
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
