'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type { Athlete } from '@/lib/athlete-context';
import type { DayKey } from '@/lib/plan-hyrox';
import type { HeatRow } from '@/components/training/ProgressHeatmap';

interface Row {
  week: number;
  day_key: DayKey;
  rpe: number | null;
  completed: boolean | null;
}

export function useTrainingAll(athlete: Athlete | null, currentWeek: number) {
  const [rows, setRows] = useState<HeatRow[]>([]);
  const [loading, setLoading] = useState<boolean>(athlete !== null);

  useEffect(() => {
    if (!athlete) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseClient()
        .from('registros')
        .select('week,day_key,rpe,completed')
        .eq('athlete', athlete);
      if (cancelled) return;
      if (error) { saveState.getState().set('error', error.message); setLoading(false); return; }
      const byWeek = new Map<number, HeatRow>();
      const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1).slice(-10);
      for (const w of weeks) byWeek.set(w, { week: w, D1: null, D2: null, D3: null, D4: null });
      for (const r of (data ?? []) as Row[]) {
        const entry = byWeek.get(r.week);
        if (!entry) continue;
        entry[r.day_key] = { rpe: r.rpe, completed: !!r.completed };
      }
      setRows(weeks.map((w) => byWeek.get(w)!));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athlete, currentWeek]);

  return { loading, rows };
}
