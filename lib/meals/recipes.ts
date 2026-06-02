// Core types and constants for the Comidas module.

export const AISLES = [
  'frutas_verduras',
  'pescaderia',
  'carniceria',
  'lacteos',
  'panaderia',
  'despensa',
  'congelados',
  'bebidas',
  'limpieza',
  'otros',
] as const;

export type Aisle = (typeof AISLES)[number];

// Supermarket flow order — same as the AISLES constant.
export const aisleOrder: Record<Aisle, number> = AISLES.reduce(
  (acc, a, idx) => {
    acc[a] = idx;
    return acc;
  },
  {} as Record<Aisle, number>,
);

const AISLE_LABELS: Record<Aisle, string> = {
  frutas_verduras: 'Frutas y verduras',
  pescaderia: 'Pescadería',
  carniceria: 'Carnicería',
  lacteos: 'Lácteos',
  panaderia: 'Panadería',
  despensa: 'Despensa',
  congelados: 'Congelados',
  bebidas: 'Bebidas',
  limpieza: 'Limpieza',
  otros: 'Otros',
};

export function aisleLabel(a: Aisle): string {
  return AISLE_LABELS[a];
}

export function isAisle(x: unknown): x is Aisle {
  return typeof x === 'string' && (AISLES as readonly string[]).includes(x);
}

export type RecipeSourceType = 'tiktok' | 'manual' | 'instagram' | 'web' | 'other';

export type RecipeUnit = 'g' | 'ml' | 'unidad' | 'cda' | 'cdita' | 'pizca' | 'al gusto' | null;

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  aisle: Aisle;
  optional?: boolean;
  position?: number;
}

export interface RecipeStep {
  id?: string;
  recipe_id?: string;
  position: number;
  body: string;
  timer_min: number | null;
}

export interface Recipe {
  id: string;
  title: string;
  source_url: string | null;
  source_type: RecipeSourceType | null;
  image_url: string | null;
  prep_minutes: number | null;
  servings: number | null;
  tags: string[];
  notes: string | null;
  created_by: 'MK' | 'Xabi' | null;
  meal_type: MealSlot | null;
  // Poster image for the recipe — sourced from TikTok's oEmbed when
  // available, else null. Distinct from `image_url` which is the
  // user-uploaded primary photo. Renders as the 9:16 background in the
  // TikTok-style recipe card.
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeImage {
  id: string;
  recipe_id: string;
  url: string;
  position: number;
  created_at: string;
}

export interface RecipeWithDetails extends Recipe {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  images: string[];
}

// Deterministic emoji from a recipe title for placeholder cards/headers.
const RECIPE_FALLBACK_EMOJIS = [
  '🍝', '🍗', '🥗', '🍣', '🍳', '🐟', '🫘', '🎃', '🍔', '🌯', '🍕', '🥘',
] as const;

export function recipeFallbackEmoji(title: string): string {
  const seed = (title ?? '').trim();
  if (!seed) return '🍽️';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % RECIPE_FALLBACK_EMOJIS.length;
  return RECIPE_FALLBACK_EMOJIS[idx];
}

// Pretty pastel gradient for placeholder cards (cycles through a fixed palette).
const RECIPE_FALLBACK_GRADIENTS = [
  'from-rose-200 to-amber-200',
  'from-amber-200 to-orange-200',
  'from-emerald-200 to-cyan-200',
  'from-sky-200 to-violet-200',
  'from-violet-200 to-rose-200',
  'from-lime-200 to-emerald-200',
  'from-orange-200 to-rose-200',
  'from-cyan-200 to-sky-200',
] as const;

export function recipeFallbackGradient(title: string): string {
  const seed = (title ?? '').trim();
  if (!seed) return RECIPE_FALLBACK_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % RECIPE_FALLBACK_GRADIENTS.length;
  return RECIPE_FALLBACK_GRADIENTS[idx];
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';

export const MEAL_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const;

const MEAL_SLOT_LABELS_MAP: Record<MealSlot, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snack: 'Snack',
  dessert: 'Postres',
};

export function mealSlotLabel(slot: MealSlot): string {
  return MEAL_SLOT_LABELS_MAP[slot];
}

export const MEAL_SLOT_LABELS = MEAL_SLOT_LABELS_MAP;

export type MealDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const MEAL_DAYS: MealDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_LABELS: Record<MealDay, string> = {
  mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom',
};

export interface MealPlanRow {
  id: string;
  week_start: string;
  day: MealDay;
  slot: MealSlot;
  recipe_id: string | null;
  servings: number;
  done: boolean;
  prepared?: boolean;
  eaten?: boolean;
  recipe?: Recipe | null;
}

export interface PantryItem {
  id: string;
  name: string;
  aisle: Aisle;
  in_stock: boolean;
  units: number | null;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  week_start: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  aisle: Aisle;
  source: 'plan' | 'manual';
  recipe_ids: string[];
  checked: boolean;
  archived: boolean;
  position: number;
  created_at: string;
}

// A pseudo-stable tag color from a string (hue cycle).
export function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 60%)`;
}

export function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase();
}
