'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type { Athlete } from '@/lib/athlete-context';
import type { DayKey } from '@/lib/plan-hyrox';

export interface CustomBlock {
  name?: string;
  sets?: string;
  load?: string;
}

export interface ExtraBlock {
  name: string;
  sets: string;
  load: string;
}

export interface TrainingLog {
  completed: boolean;
  rpe: number | null;
  notes: string | null;
  customBlocks: Record<number, CustomBlock>;
  extraBlocks: ExtraBlock[];
  weekNote: string | null;
}

export type TrainingByKey = Partial<Record<DayKey, TrainingLog>>;

interface RegistrosRow {
  week: number;
  day_key: DayKey;
  completed: boolean | null;
  rpe: number | null;
  notes: string | null;
  custom_blocks: Record<number, CustomBlock> | null;
  extra_blocks: ExtraBlock[] | null;
  week_note: string | null;
}

const EMPTY: TrainingLog = {
  completed: false,
  rpe: null,
  notes: null,
  customBlocks: {},
  extraBlocks: [],
  weekNote: null,
};

export function useTraining(athlete: Athlete | null, week: number) {
  const [byKey, setByKey] = useState<TrainingByKey>({});
  const [loading, setLoading] = useState<boolean>(athlete !== null);

  useEffect(() => {
    if (!athlete) { setByKey({}); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseClient()
        .from('registros')
        .select('week,day_key,completed,rpe,notes,custom_blocks,extra_blocks,week_note')
        .eq('athlete', athlete)
        .eq('week', week);
      if (cancelled) return;
      if (error) {
        saveState.getState().set('error', error.message);
        setLoading(false);
        return;
      }
      const next: TrainingByKey = {};
      for (const r of (data ?? []) as RegistrosRow[]) {
        next[r.day_key] = {
          completed: !!r.completed,
          rpe: r.rpe,
          notes: r.notes,
          customBlocks: r.custom_blocks ?? {},
          extraBlocks: r.extra_blocks ?? [],
          weekNote: r.week_note,
        };
      }
      setByKey(next);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athlete, week]);

  const setLog = useCallback(
    async (dayKey: DayKey, patch: Partial<TrainingLog>) => {
      if (!athlete) return;
      const cur = byKey[dayKey] ?? EMPTY;
      const merged: TrainingLog = { ...cur, ...patch };
      setByKey((prev) => ({ ...prev, [dayKey]: merged }));
      saveState.getState().set('saving');
      const { error } = await supabaseClient().from('registros').upsert(
        {
          athlete,
          week,
          day_key: dayKey,
          completed: merged.completed,
          rpe: merged.rpe,
          notes: merged.notes,
          custom_blocks: merged.customBlocks,
          extra_blocks: merged.extraBlocks,
          week_note: merged.weekNote,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'athlete,week,day_key' }
      );
      if (error) saveState.getState().set('error', error.message);
      else saveState.getState().set('saved');
    },
    [athlete, week, byKey]
  );

  /** Set week note across all 4 days for this week (legacy parity). */
  const setWeekNote = useCallback(
    async (note: string, dayKeys: DayKey[]) => {
      if (!athlete) return;
      saveState.getState().set('saving');
      const rows = dayKeys.map((dk) => {
        const cur = byKey[dk] ?? EMPTY;
        return {
          athlete,
          week,
          day_key: dk,
          completed: cur.completed,
          rpe: cur.rpe,
          notes: cur.notes,
          custom_blocks: cur.customBlocks,
          extra_blocks: cur.extraBlocks,
          week_note: note,
          updated_at: new Date().toISOString(),
        };
      });
      setByKey((prev) => {
        const next: TrainingByKey = { ...prev };
        for (const dk of dayKeys) {
          next[dk] = { ...(prev[dk] ?? EMPTY), weekNote: note };
        }
        return next;
      });
      const { error } = await supabaseClient()
        .from('registros')
        .upsert(rows, { onConflict: 'athlete,week,day_key' });
      if (error) saveState.getState().set('error', error.message);
      else saveState.getState().set('saved');
    },
    [athlete, week, byKey]
  );

  return { loading, byKey, setLog, setWeekNote };
}
