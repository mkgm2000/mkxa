// Aggregates per-100g macros stored on ingredients/products into per-portion
// macros for the weekly meal plan. Everything that can't be computed
// exactly falls back to a category-based estimate via macros-estimates.ts
// and is flagged as such so the UI can show a warning.

import { estimateMacros } from '@/lib/meals/macros-estimates';
import type { Aisle, RecipeIngredient } from '@/lib/meals/recipes';

export interface MacrosSum {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Any of the components included an estimate. */
  hasEstimate: boolean;
}

export function zeroMacros(): MacrosSum {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0, hasEstimate: false };
}

export function addMacros(a: MacrosSum, b: MacrosSum): MacrosSum {
  return {
    kcal:    a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs:   a.carbs + b.carbs,
    fat:     a.fat + b.fat,
    hasEstimate: a.hasEstimate || b.hasEstimate,
  };
}

// Best-effort conversion of an ingredient's quantity+unit into grams.
// Returns null if the unit makes no sense to convert (will trigger the
// fallback estimate path).
const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1, gr: 1, gramo: 1, gramos: 1,
  kg: 1000, kilo: 1000, kilos: 1000,
  ml: 1, cc: 1, // assume density 1 (water-like)
  l: 1000, litro: 1000, litros: 1000,
  ud: 100, uds: 100, unidad: 100, unidades: 100,
  cucharada: 15, cucharadas: 15,
  cucharadita: 5, cucharaditas: 5,
  diente: 5, dientes: 5,
  pizca: 1, pizcas: 1,
  vaso: 200, vasos: 200,
  taza: 240, tazas: 240,
  lata: 200, latas: 200,
  rebanada: 25, rebanadas: 25,
  loncha: 25, lonchas: 25,
};

export function ingredientGrams(qty: number | null | undefined, unit: string | null | undefined): number | null {
  if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) return null;
  const key = (unit ?? '').trim().toLowerCase();
  if (key === '') return qty * 100; // assume "ud" if unitless
  const factor = UNIT_TO_GRAMS[key];
  if (typeof factor !== 'number') return null;
  return qty * factor;
}

interface IngredientWithMacros extends RecipeIngredient {
  kcal_100g?: number | null;
  protein_100g?: number | null;
  carbs_100g?: number | null;
  fat_100g?: number | null;
}

// Computes macros for one ingredient consumed in `servingsFactor` portions
// of the recipe (e.g. plan.servings / recipe.servings).
export function macrosForIngredient(
  ing: IngredientWithMacros,
  servingsFactor: number,
): MacrosSum {
  const grams = ingredientGrams(ing.quantity, ing.unit);
  const useReal = ing.kcal_100g != null;
  const macros = useReal
    ? {
        kcal_100g: ing.kcal_100g ?? 0,
        protein_100g: ing.protein_100g ?? 0,
        carbs_100g: ing.carbs_100g ?? 0,
        fat_100g: ing.fat_100g ?? 0,
      }
    : estimateMacros({ name: ing.name, categoryTop: aisleAsCategory(ing.aisle) });

  if (grams === null) {
    // Without a credible weight, assume 100g per portion as a rough estimate.
    const portionG = 100 * servingsFactor;
    return {
      kcal:    (macros.kcal_100g    * portionG) / 100,
      protein: (macros.protein_100g * portionG) / 100,
      carbs:   (macros.carbs_100g   * portionG) / 100,
      fat:     (macros.fat_100g     * portionG) / 100,
      hasEstimate: true, // unit was unknown, definitely estimated
    };
  }

  const totalG = grams * servingsFactor;
  return {
    kcal:    (macros.kcal_100g    * totalG) / 100,
    protein: (macros.protein_100g * totalG) / 100,
    carbs:   (macros.carbs_100g   * totalG) / 100,
    fat:     (macros.fat_100g     * totalG) / 100,
    hasEstimate: !useReal,
  };
}

// Map our supermarket aisle to a textual "category hint" that the
// estimateMacros table can pattern-match against.
function aisleAsCategory(a: Aisle): string {
  switch (a) {
    case 'frutas_verduras': return 'Fruta y verdura';
    case 'pescaderia':      return 'Pescado';
    case 'carniceria':      return 'Carne';
    case 'lacteos':         return 'Lácteos';
    case 'panaderia':       return 'Pan';
    case 'congelados':      return 'Congelados';
    case 'bebidas':         return 'Bebidas';
    case 'limpieza':        return 'Limpieza';
    case 'despensa':        return 'Despensa';
    case 'otros':           return 'Otros';
  }
}

export function roundMacros(m: MacrosSum): MacrosSum {
  return {
    kcal:    Math.round(m.kcal),
    protein: Math.round(m.protein),
    carbs:   Math.round(m.carbs),
    fat:     Math.round(m.fat),
    hasEstimate: m.hasEstimate,
  };
}
