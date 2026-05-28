'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type { MealDay, MealPlanRow, MealSlot, Recipe } from '@/lib/meals/recipes';
import { startOfWeekISO } from '@/lib/date';

export function currentWeekStart(): string {
  return startOfWeekISO(new Date());
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

  return { plan, loading, refresh, upsertSlot, clearSlot };
}
