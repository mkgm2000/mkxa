import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { aggregateShoppingList } from '@/lib/meals/aggregate-shopping';
import type { MealPlanRow, PantryItem, Recipe, RecipeIngredient } from '@/lib/meals/recipes';

export const runtime = 'nodejs';

const Body = z.object({ week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function POST(req: Request) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 });
  const { week_start } = parsed.data;

  const supa = supabaseServer();

  const { data: planRows, error: e1 } = await supa
    .from('meal_plan').select('*').eq('week_start', week_start);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  const plans = (planRows as MealPlanRow[]) ?? [];

  const recipeIds = Array.from(
    new Set(plans.map((p) => p.recipe_id).filter((x): x is string => Boolean(x))),
  );

  let recipes: Recipe[] = [];
  let ingredients: RecipeIngredient[] = [];
  if (recipeIds.length > 0) {
    const [{ data: rs, error: e2 }, { data: ig, error: e3 }] = await Promise.all([
      supa.from('recipes').select('*').in('id', recipeIds),
      supa.from('recipe_ingredients').select('*').in('recipe_id', recipeIds),
    ]);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });
    recipes = (rs as Recipe[]) ?? [];
    ingredients = (ig as RecipeIngredient[]) ?? [];
  }

  const { data: pantry, error: e4 } = await supa.from('pantry_items').select('*');
  if (e4) return NextResponse.json({ error: e4.message }, { status: 500 });

  const rows = aggregateShoppingList({
    plans, recipes, ingredients,
    pantry: (pantry as PantryItem[]) ?? [],
    weekStart: week_start,
  });

  // Archive previous active list for the week so the new one is the only active one.
  const { error: e5 } = await supa
    .from('shopping_list')
    .update({ archived: true })
    .match({ week_start, archived: false });
  if (e5) return NextResponse.json({ error: e5.message }, { status: 500 });

  if (rows.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const { data: inserted, error: e6 } = await supa
    .from('shopping_list')
    .insert(rows)
    .select('*');
  if (e6) return NextResponse.json({ error: e6.message }, { status: 500 });

  return NextResponse.json({ rows: inserted ?? [] });
}
