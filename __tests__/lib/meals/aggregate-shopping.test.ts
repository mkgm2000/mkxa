import { describe, it, expect } from 'vitest';
import { aggregateShoppingList } from '@/lib/meals/aggregate-shopping';
import type {
  Recipe,
  RecipeIngredient,
  MealPlanRow,
  PantryItem,
} from '@/lib/meals/recipes';

function recipe(id: string, title: string, servings = 2): Recipe {
  return {
    id, title,
    source_url: null, source_type: null, image_url: null,
    prep_minutes: null, servings, tags: [], notes: null,
    created_by: null,
    meal_type: null,
    thumbnail_url: null,
    created_at: '2026-05-28T00:00:00Z',
    updated_at: '2026-05-28T00:00:00Z',
  };
}

function ing(
  recipe_id: string,
  name: string,
  quantity: number | null,
  unit: string | null,
  aisle: RecipeIngredient['aisle'],
  position = 0,
): RecipeIngredient {
  return { recipe_id, name, quantity, unit, aisle, optional: false, position };
}

describe('aggregateShoppingList', () => {
  it('returns empty array when no plans', () => {
    const out = aggregateShoppingList({
      plans: [], recipes: [], ingredients: [], pantry: [],
      weekStart: '2026-05-25',
    });
    expect(out).toEqual([]);
  });

  it('skips plans without a recipe_id', () => {
    const out = aggregateShoppingList({
      plans: [
        { id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch', recipe_id: null, servings: 2, done: false },
      ],
      recipes: [], ingredients: [], pantry: [],
      weekStart: '2026-05-25',
    });
    expect(out).toEqual([]);
  });

  it('produces one row per ingredient for a single recipe', () => {
    const r = recipe('r1', 'Tortilla');
    const ingredients = [
      ing('r1', 'huevo',   4,   'unidad', 'lacteos', 0),
      ing('r1', 'patata', 300, 'g',      'frutas_verduras', 1),
    ];
    const out = aggregateShoppingList({
      plans: [{ id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch', recipe_id: 'r1', servings: 2, done: false }],
      recipes: [r],
      ingredients,
      pantry: [],
      weekStart: '2026-05-25',
    });

    expect(out).toHaveLength(2);
    // Ordered by aisle (frutas_verduras index 0 → first).
    expect(out[0].name).toBe('patata');
    expect(out[0].aisle).toBe('frutas_verduras');
    expect(out[1].name).toBe('huevo');
  });

  it('sums quantities when units match (lowercase normalization)', () => {
    const r1 = recipe('r1', 'Ensalada');
    const r2 = recipe('r2', 'Sopa');
    const ingredients = [
      ing('r1', 'Tomate', 200, 'g', 'frutas_verduras'),
      ing('r2', 'tomate', 150, 'G', 'frutas_verduras'),
    ];
    const out = aggregateShoppingList({
      plans: [
        { id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch',  recipe_id: 'r1', servings: 2, done: false },
        { id: 'p2', week_start: '2026-05-25', day: 'tue', slot: 'dinner', recipe_id: 'r2', servings: 2, done: false },
      ],
      recipes: [r1, r2],
      ingredients,
      pantry: [],
      weekStart: '2026-05-25',
    });

    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('tomate');
    expect(out[0].quantity).toBe(350);
    expect(out[0].recipe_ids).toEqual(expect.arrayContaining(['r1', 'r2']));
  });

  it('keeps separate entries when units differ', () => {
    const r1 = recipe('r1', 'A');
    const r2 = recipe('r2', 'B');
    const ingredients = [
      ing('r1', 'leche', 200, 'ml', 'lacteos'),
      ing('r2', 'leche', 1,   'unidad', 'lacteos'),
    ];
    const out = aggregateShoppingList({
      plans: [
        { id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch',  recipe_id: 'r1', servings: 2, done: false },
        { id: 'p2', week_start: '2026-05-25', day: 'tue', slot: 'dinner', recipe_id: 'r2', servings: 2, done: false },
      ],
      recipes: [r1, r2],
      ingredients,
      pantry: [],
      weekStart: '2026-05-25',
    });
    expect(out).toHaveLength(2);
  });

  it('scales quantity by plan servings vs recipe servings', () => {
    const r = recipe('r1', 'Plato', 2);
    const ingredients = [ing('r1', 'arroz', 100, 'g', 'despensa')];
    const out = aggregateShoppingList({
      plans: [
        // 4 servings on a recipe-of-2 → x2 → 200g.
        { id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch', recipe_id: 'r1', servings: 4, done: false },
      ],
      recipes: [r],
      ingredients,
      pantry: [],
      weekStart: '2026-05-25',
    });
    expect(out[0].quantity).toBe(200);
  });

  it('subtracts pantry in_stock items by normalized name', () => {
    const r = recipe('r1', 'X');
    const ingredients = [
      ing('r1', 'Sal',   1,   'pizca', 'despensa'),
      ing('r1', 'arroz', 100, 'g',     'despensa'),
    ];
    const out = aggregateShoppingList({
      plans: [{ id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch', recipe_id: 'r1', servings: 2, done: false }],
      recipes: [r],
      ingredients,
      pantry: [
        { id: 'pi1', name: ' sal ', aisle: 'despensa', in_stock: true,  updated_at: '' },
        { id: 'pi2', name: 'arroz', aisle: 'despensa', in_stock: false, updated_at: '' },
      ],
      weekStart: '2026-05-25',
    });
    expect(out.map((o) => o.name)).toEqual(['arroz']);
  });

  it('orders results by aisleOrder then position', () => {
    const r = recipe('r1', 'X');
    const ingredients = [
      ing('r1', 'limpieza1', 1, 'unidad', 'limpieza',         0),
      ing('r1', 'fruta1',    1, 'unidad', 'frutas_verduras',  0),
      ing('r1', 'fruta2',    1, 'unidad', 'frutas_verduras',  1),
      ing('r1', 'pan',       1, 'unidad', 'panaderia',        0),
    ];
    const out = aggregateShoppingList({
      plans: [{ id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch', recipe_id: 'r1', servings: 2, done: false }],
      recipes: [r],
      ingredients,
      pantry: [],
      weekStart: '2026-05-25',
    });
    expect(out.map((o) => o.name)).toEqual(['fruta1', 'fruta2', 'pan', 'limpieza1']);
  });

  it('skips ingredients whose recipe is not in the recipes list', () => {
    const ingredients = [ing('r-missing', 'sal', 1, 'pizca', 'despensa')];
    const out = aggregateShoppingList({
      plans: [{ id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch', recipe_id: 'r-missing', servings: 2, done: false }],
      recipes: [], ingredients, pantry: [],
      weekStart: '2026-05-25',
    });
    expect(out).toEqual([]);
  });

  it('treats null quantity as null, never NaN', () => {
    const r = recipe('r1', 'A');
    const out = aggregateShoppingList({
      plans: [{ id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch', recipe_id: 'r1', servings: 2, done: false }],
      recipes: [r],
      ingredients: [ing('r1', 'sal', null, 'pizca', 'despensa')],
      pantry: [],
      weekStart: '2026-05-25',
    });
    expect(out[0].quantity).toBeNull();
  });

  it('does not double-count when same recipe appears in multiple slots', () => {
    const r = recipe('r1', 'Plato', 2);
    const out = aggregateShoppingList({
      plans: [
        { id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch',  recipe_id: 'r1', servings: 2, done: false },
        { id: 'p2', week_start: '2026-05-25', day: 'tue', slot: 'dinner', recipe_id: 'r1', servings: 2, done: false },
      ],
      recipes: [r],
      ingredients: [ing('r1', 'arroz', 100, 'g', 'despensa')],
      pantry: [],
      weekStart: '2026-05-25',
    });
    expect(out).toHaveLength(1);
    expect(out[0].quantity).toBe(200);
    expect(out[0].recipe_ids).toEqual(['r1']); // Distinct
  });

  it('assigns sequential positions per aisle group', () => {
    const r = recipe('r1', 'X');
    const ingredients = [
      ing('r1', 'a', 1, 'g', 'frutas_verduras', 0),
      ing('r1', 'b', 1, 'g', 'frutas_verduras', 1),
      ing('r1', 'c', 1, 'g', 'despensa',        0),
    ];
    const out = aggregateShoppingList({
      plans: [{ id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch', recipe_id: 'r1', servings: 2, done: false }],
      recipes: [r], ingredients, pantry: [],
      weekStart: '2026-05-25',
    });
    out.forEach((o, i) => expect(o.position).toBe(i));
  });

  it('all returned rows carry the requested week_start', () => {
    const r = recipe('r1', 'X');
    const out = aggregateShoppingList({
      plans: [{ id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch', recipe_id: 'r1', servings: 2, done: false }],
      recipes: [r],
      ingredients: [ing('r1', 'sal', 1, 'pizca', 'despensa')],
      pantry: [],
      weekStart: '2026-06-01',
    });
    expect(out[0].week_start).toBe('2026-06-01');
  });
});
