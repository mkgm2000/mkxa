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
  type MealPassKind,
} from '@/lib/meals/meal-passes';

interface UseMealPassesResult {
  passes: MealPass[];
  loading: boolean;
  remaining: number;
  monthLabel: string;
  redeem: (idx: number) => Promise<void>;
  setPlace: (idx: number, place: string) => Promise<void>;
  setKind: (idx: number, kind: MealPassKind) => Promise<void>;
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

  // ensureMonth: never overwrite existing rows. Read what's already there for
  // this month and only INSERT the indices that are missing. This is critical
  // when bumping the per-month count (e.g. 3 -> 4) so months that already had
  // some redeemed passes don't lose their data.
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
    const existing = (data as MealPass[] | null) ?? [];
    const haveIdx = new Set(existing.map((p) => p.idx));
    const missing = [];
    for (let i = 0; i < MEAL_PASSES_PER_MONTH; i++) {
      if (!haveIdx.has(i)) {
        missing.push({
          month_key: key,
          idx: i,
          redeemed: false,
          place: null,
          kind: 'dine' as MealPassKind,
          note: MEAL_PASS_NOTES[i] ?? '',
        });
      }
    }
    if (missing.length === 0) {
      return existing;
    }
    // Per-spec: insert with onConflict ignoreDuplicates so a concurrent seed
    // can't blow away rows we just read.
    const { error: insErr } = await supa
      .from('meal_passes')
      .upsert(missing, { onConflict: 'month_key,idx', ignoreDuplicates: true });
    if (insErr) {
      saveState.getState().set('error');
      return existing;
    }
    const { data: fresh, error: refErr } = await supa
      .from('meal_passes')
      .select('*')
      .eq('month_key', key)
      .order('idx', { ascending: true });
    if (refErr) {
      saveState.getState().set('error');
      return existing;
    }
    return (fresh as MealPass[]) ?? existing;
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

  const setKind = useCallback(async (idx: number, kind: MealPassKind) => {
    const target = passes.find((p) => p.idx === idx);
    if (!target) return;
    setPasses((arr) => arr.map((p) => (p.idx === idx ? { ...p, kind } : p)));
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('meal_passes')
      .update({ kind })
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
  return { passes, loading, remaining, monthLabel, redeem, setPlace, setKind, resetMonth };
}
