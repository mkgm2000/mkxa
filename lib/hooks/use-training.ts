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
  athlete: Athlete;
  week: number;
  day_key: DayKey;
  completed: boolean | null;
  rpe: number | null;
  notes: string | null;
  custom_blocks: Record<number, CustomBlock> | null;
  extra_blocks: ExtraBlock[] | null;
  week_note: string | null;
  updated_at: string | null;
}

const EMPTY: TrainingLog = {
  completed: false,
  rpe: null,
  notes: null,
  customBlocks: {},
  extraBlocks: [],
  weekNote: null,
};

const OTHER: Record<Athlete, Athlete> = { MK: 'Xabi', Xabi: 'MK' };

export function useTraining(athlete: Athlete | null, week: number) {
  const [byKey, setByKey] = useState<TrainingByKey>({});
  const [loading, setLoading] = useState<boolean>(athlete !== null);

  useEffect(() => {
    if (!athlete) { setByKey({}); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Fetch the current athlete's rows first (preserves legacy query shape).
      const mineRes = await supabaseClient()
        .from('registros')
        .select('athlete,week,day_key,completed,rpe,notes,custom_blocks,extra_blocks,week_note,updated_at')
        .eq('athlete', athlete)
        .eq('week', week);
      if (cancelled) return;
      if (mineRes.error) {
        saveState.getState().set('error', mineRes.error.message);
        setLoading(false);
        return;
      }
      // Fetch the OTHER athlete's rows so we can merge shared notes/week_note.
      const otherRes = await supabaseClient()
        .from('registros')
        .select('athlete,week,day_key,completed,rpe,notes,custom_blocks,extra_blocks,week_note,updated_at')
        .eq('athlete', OTHER[athlete])
        .eq('week', week);
      if (cancelled) return;
      if (otherRes.error) {
        saveState.getState().set('error', otherRes.error.message);
        setLoading(false);
        return;
      }
      const mineRows = (mineRes.data ?? []) as RegistrosRow[];
      const otherRows = (otherRes.data ?? []) as RegistrosRow[];
      const allRows = [...mineRows, ...otherRows];

      // Group rows by day_key, separating current athlete from other athlete.
      // We rely on which query returned the row, not the row.athlete field,
      // so the merge is robust even if the column is omitted from the select.
      const byDay = new Map<DayKey, { mine?: RegistrosRow; other?: RegistrosRow }>();
      for (const r of mineRows) {
        const slot = byDay.get(r.day_key) ?? {};
        slot.mine = r;
        byDay.set(r.day_key, slot);
      }
      for (const r of otherRows) {
        const slot = byDay.get(r.day_key) ?? {};
        slot.other = r;
        byDay.set(r.day_key, slot);
      }

      // Determine the most recent week_note across BOTH athletes & all day_keys.
      let sharedWeekNote: string | null = null;
      let sharedWeekNoteTs = '';
      for (const r of allRows) {
        if (r.week_note != null && r.week_note !== '') {
          const ts = r.updated_at ?? '';
          if (ts >= sharedWeekNoteTs) {
            sharedWeekNoteTs = ts;
            sharedWeekNote = r.week_note;
          }
        }
      }

      const next: TrainingByKey = {};
      byDay.forEach((slot, dk) => {
        const mine = slot.mine;
        const other = slot.other;

        // notes: latest non-null wins across the two athletes for this day_key
        let notes: string | null = null;
        const mineTs = mine?.updated_at ?? '';
        const otherTs = other?.updated_at ?? '';
        const mineHas = mine && mine.notes != null;
        const otherHas = other && other.notes != null;
        if (mineHas && otherHas) {
          notes = mineTs >= otherTs ? mine!.notes : other!.notes;
        } else if (mineHas) {
          notes = mine!.notes;
        } else if (otherHas) {
          notes = other!.notes;
        }

        next[dk] = {
          completed: !!mine?.completed,
          rpe: mine?.rpe ?? null,
          notes,
          customBlocks: mine?.custom_blocks ?? {},
          extraBlocks: mine?.extra_blocks ?? [],
          weekNote: sharedWeekNote,
        };
      });
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
      const nowIso = new Date().toISOString();
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
          updated_at: nowIso,
        },
        { onConflict: 'athlete,week,day_key' }
      );
      if (error) {
        saveState.getState().set('error', error.message);
        return;
      }

      // If notes is part of the patch, mirror it to the OTHER athlete so the
      // textual feedback stays shared. Only notes + updated_at travel; other
      // per-athlete columns are left untouched on update (defaults on insert).
      if (Object.prototype.hasOwnProperty.call(patch, 'notes')) {
        const { error: mirrorErr } = await supabaseClient().from('registros').upsert(
          {
            athlete: OTHER[athlete],
            week,
            day_key: dayKey,
            notes: merged.notes,
            updated_at: nowIso,
          },
          { onConflict: 'athlete,week,day_key' }
        );
        if (mirrorErr) {
          saveState.getState().set('error', mirrorErr.message);
          return;
        }
      }

      saveState.getState().set('saved');
    },
    [athlete, week, byKey]
  );

  /** Set week note across all 4 days for this week, shared between athletes. */
  const setWeekNote = useCallback(
    async (note: string, dayKeys: DayKey[]) => {
      if (!athlete) return;
      saveState.getState().set('saving');
      const nowIso = new Date().toISOString();
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
          updated_at: nowIso,
        };
      });
      // Mirror week_note to the OTHER athlete's rows. Only week_note +
      // updated_at travel so per-athlete columns stay untouched on update.
      const mirrorRows = dayKeys.map((dk) => ({
        athlete: OTHER[athlete],
        week,
        day_key: dk,
        week_note: note,
        updated_at: nowIso,
      }));
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
      if (error) {
        saveState.getState().set('error', error.message);
        return;
      }
      const { error: mirrorErr } = await supabaseClient()
        .from('registros')
        .upsert(mirrorRows, { onConflict: 'athlete,week,day_key' });
      if (mirrorErr) {
        saveState.getState().set('error', mirrorErr.message);
        return;
      }
      saveState.getState().set('saved');
    },
    [athlete, week, byKey]
  );

  return { loading, byKey, setLog, setWeekNote };
}
