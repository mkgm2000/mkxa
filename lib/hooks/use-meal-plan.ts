'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type { MealDay, MealPlanRow, MealSlot, Recipe } from '@/lib/meals/recipes';
import { addDaysISO, startOfWeekISO } from '@/lib/date';

export function currentWeekStart(): string {
  return startOfWeekISO(new Date());
}

// MK plans NEXT week's meals (she sits down on the weekend and writes
// monday-onwards). The weekly planner + shopping list both target the
// upcoming Monday; once it arrives, what was "next" becomes "current"
// and the home/today views pick it up automatically.
export function nextWeekStart(): string {
  return addDaysISO(startOfWeekISO(new Date()), 7);
}

export function useMealPlan(weekStart: string | null) {
  const [plan, setPlan] = useState<MealPlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!weekStart) { setPlan([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabaseClient()
      .from('meal_plan')
      .select('*, recipe:recipes(*)')
      .eq('week_start', weekStart);
    if (error) { saveState.getState().set('error'); setLoading(false); return; }
    type Row = MealPlanRow & { recipe?: Recipe | null };
    setPlan(((data as Row[]) ?? []) as MealPlanRow[]);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { refresh(); }, [refresh]);

  const upsertSlot = useCallback(async (params: {
    day: MealDay; slot: MealSlot; recipe_id: string | null; servings?: number;
  }) => {
    if (!weekStart) return;
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('meal_plan')
      .upsert({
        week_start: weekStart,
        day: params.day,
        slot: params.slot,
        recipe_id: params.recipe_id,
        servings: params.servings ?? 2,
      }, { onConflict: 'week_start,day,slot' });
    if (error) { saveState.getState().set('error'); return; }
    saveState.getState().set('saved');
    await refresh();
  }, [weekStart, refresh]);

  const clearSlot = useCallback(async (params: { day: MealDay; slot: MealSlot }) => {
    if (!weekStart) return;
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('meal_plan')
      .delete()
      .match({ week_start: weekStart, day: params.day, slot: params.slot });
    if (error) { saveState.getState().set('error'); return; }
    saveState.getState().set('saved');
    await refresh();
  }, [weekStart, refresh]);

  const setPrepared = useCallback(async (day: MealDay, slot: MealSlot, value: boolean) => {
    if (!weekStart) return;
    // Optimistic update
    setPlan((prev) => prev.map((r) =>
      r.day === day && r.slot === slot ? { ...r, prepared: value } : r
    ));
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('meal_plan')
      .update({ prepared: value })
      .match({ week_start: weekStart, day, slot });
    if (error) { saveState.getState().set('error'); await refresh(); return; }
    saveState.getState().set('saved');
  }, [weekStart, refresh]);

  const setEaten = useCallback(async (day: MealDay, slot: MealSlot, value: boolean) => {
    if (!weekStart) return;
    // If eating, also imply prepared=true.
    const row = plan.find((r) => r.day === day && r.slot === slot);
    const alsoPrepare = value === true && row && row.prepared !== true;
    // Optimistic update
    setPlan((prev) => prev.map((r) =>
      r.day === day && r.slot === slot
        ? { ...r, eaten: value, prepared: alsoPrepare ? true : r.prepared }
        : r
    ));
    saveState.getState().set('saving');
    const patch: { eaten: boolean; prepared?: boolean } = { eaten: value };
    if (alsoPrepare) patch.prepared = true;
    const { error } = await supabaseClient()
      .from('meal_plan')
      .update(patch)
      .match({ week_start: weekStart, day, slot });
    if (error) { saveState.getState().set('error'); await refresh(); return; }
    saveState.getState().set('saved');
  }, [weekStart, plan, refresh]);

  const cookAllToday = useCallback(async () => {
    if (!weekStart) return;
    // Optimistic: flip every assigned slot in current state.
    setPlan((prev) => prev.map((r) =>
      r.recipe_id ? { ...r, prepared: true } : r
    ));
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('meal_plan')
      .update({ prepared: true })
      .eq('week_start', weekStart)
      .not('recipe_id', 'is', null);
    if (error) { saveState.getState().set('error'); await refresh(); return; }
    saveState.getState().set('saved');
  }, [weekStart, refresh]);

  return { plan, loading, refresh, upsertSlot, clearSlot, setPrepared, setEaten, cookAllToday };
}
