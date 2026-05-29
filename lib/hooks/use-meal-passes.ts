'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import {
  MEAL_PASSES_PER_MONTH,
  MEAL_PASS_NOTES,
  formatRedeemDate,
  monthKey,
  type MealPass,
} from '@/lib/meals/meal-passes';

interface UseMealPassesResult {
  passes: MealPass[];
  loading: boolean;
  remaining: number;
  monthLabel: string;
  redeem: (idx: number) => Promise<void>;
  setPlace: (idx: number, place: string) => Promise<void>;
  resetMonth: () => Promise<void>;
}

const MES_FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function useMealPasses(): UseMealPassesResult {
  const [passes, setPasses] = useState<MealPass[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const mKey = monthKey(now);
  const monthLabel = `${MES_FULL[now.getMonth()]} de ${now.getFullYear()}`;

  const ensureMonth = useCallback(async (key: string): Promise<MealPass[]> => {
    const supa = supabaseClient();
    const { data, error } = await supa
      .from('meal_passes')
      .select('*')
      .eq('month_key', key)
      .order('idx', { ascending: true });
    if (error) {
      saveState.getState().set('error');
      return [];
    }
    if (data && data.length === MEAL_PASSES_PER_MONTH) {
      return data as MealPass[];
    }
    const seed = Array.from({ length: MEAL_PASSES_PER_MONTH }, (_, i) => ({
      month_key: key,
      idx: i,
      redeemed: false,
      place: null,
      note: MEAL_PASS_NOTES[i] ?? '',
    }));
    const { data: inserted, error: insErr } = await supa
      .from('meal_passes')
      .upsert(seed, { onConflict: 'month_key,idx' })
      .select('*')
      .order('idx', { ascending: true });
    if (insErr) {
      saveState.getState().set('error');
      return [];
    }
    return (inserted as MealPass[]) ?? [];
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await ensureMonth(mKey);
    setPasses(rows);
    setLoading(false);
  }, [ensureMonth, mKey]);

  useEffect(() => { void refresh(); }, [refresh]);

  const redeem = useCallback(async (idx: number) => {
    const target = passes.find((p) => p.idx === idx);
    if (!target || target.redeemed) return;
    saveState.getState().set('saving');
    const nowD = new Date();
    const formatted = formatRedeemDate(nowD);
    const optimistic = passes.map((p) =>
      p.idx === idx ? { ...p, redeemed: true, redeemed_at: nowD.toISOString(), place: p.place ?? formatted } : p,
    );
    setPasses(optimistic);
    const { error } = await supabaseClient()
      .from('meal_passes')
      .update({ redeemed: true, redeemed_at: nowD.toISOString() })
      .eq('id', target.id);
    if (error) {
      saveState.getState().set('error');
      void refresh();
      return;
    }
    saveState.getState().set('saved');
  }, [passes, refresh]);

  const setPlace = useCallback(async (idx: number, place: string) => {
    const target = passes.find((p) => p.idx === idx);
    if (!target) return;
    setPasses((arr) => arr.map((p) => (p.idx === idx ? { ...p, place } : p)));
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('meal_passes')
      .update({ place: place || null })
      .eq('id', target.id);
    if (error) saveState.getState().set('error');
    else saveState.getState().set('saved');
  }, [passes]);

  const resetMonth = useCallback(async () => {
    const supa = supabaseClient();
    const key = monthKey(new Date());
    await supa.from('meal_passes').delete().eq('month_key', key);
    await refresh();
  }, [refresh]);

  const remaining = passes.filter((p) => !p.redeemed).length;
  return { passes, loading, remaining, monthLabel, redeem, setPlace, resetMonth };
}
