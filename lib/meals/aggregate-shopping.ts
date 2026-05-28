import {
  type Aisle,
  type MealPlanRow,
  type PantryItem,
  type Recipe,
  type RecipeIngredient,
  aisleOrder,
  normalizeIngredientName,
} from './recipes';

export interface AggregatedShoppingRow {
  week_start: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  aisle: Aisle;
  source: 'plan';
  recipe_ids: string[];
  position: number;
  checked: false;
  archived: false;
}

export interface AggregateInput {
  plans: MealPlanRow[];
  recipes: Recipe[];
  ingredients: RecipeIngredient[];
  pantry: PantryItem[];
  weekStart: string;
}

interface Bucket {
  name: string; // canonical (lowercase) form used for display
  unit: string | null; // canonical form used for display
  aisle: Aisle;
  quantity: number | null;
  recipe_ids: string[];
  firstPosition: number;
}

function normalizeUnit(u: string | null): string {
  if (u === null || u === undefined) return '';
  return u.trim().toLowerCase();
}

/**
 * Aggregate weekly meal_plan rows into shopping_list candidates.
 * - Sum quantities when (name, unit) match (lowercase normalised, trimmed).
 * - Otherwise emit separate rows.
 * - Subtract pantry items with `in_stock=true` by normalised name match.
 * - Output ordered by aisleOrder then by recipe-ingredient `position`,
 *   with sequential `position` 0..n assigned across the whole list.
 */
export function aggregateShoppingList(input: AggregateInput): AggregatedShoppingRow[] {
  const { plans, recipes, ingredients, pantry, weekStart } = input;

  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const ingredientsByRecipe = new Map<string, RecipeIngredient[]>();
  for (const ing of ingredients) {
    const rid = ing.recipe_id;
    if (!rid) continue;
    if (!ingredientsByRecipe.has(rid)) ingredientsByRecipe.set(rid, []);
    ingredientsByRecipe.get(rid)!.push(ing);
  }

  // Pantry exclusion set (only in-stock items).
  const pantrySkip = new Set(
    pantry
      .filter((p) => p.in_stock)
      .map((p) => normalizeIngredientName(p.name)),
  );

  // Bucket key = aisle + normalised name + normalised unit.
  const buckets = new Map<string, Bucket>();

  for (const plan of plans) {
    if (!plan.recipe_id) continue;
    const recipe = recipeById.get(plan.recipe_id);
    if (!recipe) continue;
    const recipeIngredients = ingredientsByRecipe.get(plan.recipe_id) ?? [];
    const baseServings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
    const planServings = plan.servings && plan.servings > 0 ? plan.servings : baseServings;
    const scale = planServings / baseServings;

    for (const ing of recipeIngredients) {
      const normName = normalizeIngredientName(ing.name);
      if (!normName) continue;
      if (pantrySkip.has(normName)) continue;

      const normUnit = normalizeUnit(ing.unit);
      const key = `${ing.aisle}|${normName}|${normUnit}`;
      const scaledQty =
        ing.quantity === null || ing.quantity === undefined
          ? null
          : Number(ing.quantity) * scale;

      const existing = buckets.get(key);
      if (existing) {
        if (existing.quantity !== null && scaledQty !== null) {
          existing.quantity += scaledQty;
        } else if (existing.quantity === null && scaledQty !== null) {
          existing.quantity = scaledQty;
        }
        if (!existing.recipe_ids.includes(plan.recipe_id)) {
          existing.recipe_ids.push(plan.recipe_id);
        }
        existing.firstPosition = Math.min(existing.firstPosition, ing.position ?? 0);
      } else {
        buckets.set(key, {
          name: normName,
          unit: ing.unit === null || ing.unit === undefined ? null : String(ing.unit).trim().toLowerCase(),
          aisle: ing.aisle,
          quantity: scaledQty,
          recipe_ids: [plan.recipe_id],
          firstPosition: ing.position ?? 0,
        });
      }
    }
  }

  const ordered = Array.from(buckets.values()).sort((a, b) => {
    const oa = aisleOrder[a.aisle];
    const ob = aisleOrder[b.aisle];
    if (oa !== ob) return oa - ob;
    if (a.firstPosition !== b.firstPosition) return a.firstPosition - b.firstPosition;
    return a.name.localeCompare(b.name);
  });

  return ordered.map((b, idx) => ({
    week_start: weekStart,
    name: b.name,
    quantity: b.quantity,
    unit: b.unit && b.unit.length > 0 ? b.unit : null,
    aisle: b.aisle,
    source: 'plan' as const,
    recipe_ids: b.recipe_ids,
    position: idx,
    checked: false as const,
    archived: false as const,
  }));
}
