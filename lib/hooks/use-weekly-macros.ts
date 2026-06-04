'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { macrosForIngredient, addMacros, zeroMacros, type MacrosSum } from '@/lib/meals/macros';
import type { MealDay, MealPlanRow, MealSlot, RecipeIngredient } from '@/lib/meals/recipes';

interface RecipeMacros {
  recipeId: string;
  recipeTitle: string;
  servingsBase: number;
  totals: MacrosSum;            // total macros for the whole recipe (servingsBase portions)
  perServing: MacrosSum;        // per-1-serving macros
}

export interface WeeklyMacrosSlotRow {
  day: MealDay;
  slot: MealSlot;
  recipeTitle: string | null;
  servings: number;
  macros: MacrosSum;
}

export interface WeeklyMacrosState {
  loading: boolean;
  hasEstimate: boolean;
  bySlot: WeeklyMacrosSlotRow[];                          // flat list of all plan rows
  byDay: Record<MealDay, MacrosSum>;
  byMeal: Record<MealSlot, MacrosSum>;
  total: MacrosSum;
}

const EMPTY_BY_DAY: Record<MealDay, MacrosSum> = {
  mon: zeroMacros(), tue: zeroMacros(), wed: zeroMacros(), thu: zeroMacros(),
  fri: zeroMacros(), sat: zeroMacros(), sun: zeroMacros(),
};
const EMPTY_BY_MEAL: Record<MealSlot, MacrosSum> = {
  breakfast: zeroMacros(), lunch: zeroMacros(), dinner: zeroMacros(),
  snack: zeroMacros(), dessert: zeroMacros(),
};

export function useWeeklyMacros(weekStart: string | null, plan: MealPlanRow[]): WeeklyMacrosState {
  const [state, setState] = useState<WeeklyMacrosState>({
    loading: true,
    hasEstimate: false,
    bySlot: [],
    byDay: EMPTY_BY_DAY,
    byMeal: EMPTY_BY_MEAL,
    total: zeroMacros(),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!weekStart) {
        setState({ loading: false, hasEstimate: false, bySlot: [], byDay: EMPTY_BY_DAY, byMeal: EMPTY_BY_MEAL, total: zeroMacros() });
        return;
      }
      const recipeIds = Array.from(new Set(
        plan.filter((r) => r.recipe_id && r.recipe).map((r) => r.recipe_id as string),
      ));

      if (recipeIds.length === 0) {
        setState({ loading: false, hasEstimate: false, bySlot: [], byDay: EMPTY_BY_DAY, byMeal: EMPTY_BY_MEAL, total: zeroMacros() });
        return;
      }

      const { data, error } = await supabaseClient()
        .from('recipe_ingredients')
        .select('recipe_id,name,quantity,unit,aisle,kcal_100g,protein_100g,carbs_100g,fat_100g')
        .in('recipe_id', recipeIds);

      if (cancelled) return;
      if (error) {
        setState({ loading: false, hasEstimate: true, bySlot: [], byDay: EMPTY_BY_DAY, byMeal: EMPTY_BY_MEAL, total: zeroMacros() });
        return;
      }

      // Build per-recipe totals + per-serving macros.
      const ingsByRecipe = new Map<string, (RecipeIngredient & {
        kcal_100g?: number | null; protein_100g?: number | null; carbs_100g?: number | null; fat_100g?: number | null;
      })[]>();
      for (const row of (data ?? []) as (RecipeIngredient & { recipe_id: string; kcal_100g?: number | null; protein_100g?: number | null; carbs_100g?: number | null; fat_100g?: number | null })[]) {
        const arr = ingsByRecipe.get(row.recipe_id) ?? [];
        arr.push(row);
        ingsByRecipe.set(row.recipe_id, arr);
      }

      const recipeMacros = new Map<string, RecipeMacros>();
      for (const planRow of plan) {
        if (!planRow.recipe_id || !planRow.recipe || recipeMacros.has(planRow.recipe_id)) continue;
        const ings = ingsByRecipe.get(planRow.recipe_id) ?? [];
        const servingsBase = planRow.recipe.servings ?? 1;
        let totals = zeroMacros();
        for (const ing of ings) {
          totals = addMacros(totals, macrosForIngredient(ing, 1));
        }
        const perServing = servingsBase > 0
          ? {
              kcal:    totals.kcal    / servingsBase,
              protein: totals.protein / servingsBase,
              carbs:   totals.carbs   / servingsBase,
              fat:     totals.fat     / servingsBase,
              hasEstimate: totals.hasEstimate,
            }
          : totals;
        recipeMacros.set(planRow.recipe_id, {
          recipeId: planRow.recipe_id,
          recipeTitle: planRow.recipe.title,
          servingsBase,
          totals,
          perServing,
        });
      }

      // Aggregate per plan row using its `servings` value.
      const bySlot: WeeklyMacrosSlotRow[] = [];
      const byDay: Record<MealDay, MacrosSum> = JSON.parse(JSON.stringify(EMPTY_BY_DAY));
      const byMeal: Record<MealSlot, MacrosSum> = JSON.parse(JSON.stringify(EMPTY_BY_MEAL));
      let total: MacrosSum = zeroMacros();
      let anyEstimate = false;

      for (const planRow of plan) {
        if (!planRow.recipe_id) continue;
        const rm = recipeMacros.get(planRow.recipe_id);
        if (!rm) continue;
        const factor = planRow.servings ?? 1;
        const slotMacros: MacrosSum = {
          kcal:    rm.perServing.kcal    * factor,
          protein: rm.perServing.protein * factor,
          carbs:   rm.perServing.carbs   * factor,
          fat:     rm.perServing.fat     * factor,
          hasEstimate: rm.perServing.hasEstimate,
        };
        if (slotMacros.hasEstimate) anyEstimate = true;
        bySlot.push({
          day: planRow.day,
          slot: planRow.slot,
          recipeTitle: rm.recipeTitle,
          servings: factor,
          macros: slotMacros,
        });
        byDay[planRow.day] = addMacros(byDay[planRow.day], slotMacros);
        byMeal[planRow.slot] = addMacros(byMeal[planRow.slot], slotMacros);
        total = addMacros(total, slotMacros);
      }

      if (cancelled) return;
      setState({
        loading: false,
        hasEstimate: anyEstimate,
        bySlot,
        byDay,
        byMeal,
        total,
      });
    })();
    return () => { cancelled = true; };
  }, [weekStart, plan]);

  return state;
}
