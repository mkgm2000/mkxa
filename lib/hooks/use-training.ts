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
  /** Per-block rest override. NULL/undefined falls back to getRest() heuristic. */
  rest?: string;
}

export interface ExtraBlock {
  name: string;
  sets: string;
  load: string;
  rest?: string;
}

export interface TrainingLog {
  completed: boolean;
  rpe: number | null;
  notes: string | null;
  customBlocks: Record<number, CustomBlock>;
  extraBlocks: ExtraBlock[];
  weekNote: string | null;
  // 0=Mon..6=Sun. SHARED between athletes (mirrored on write) — they
  // normally train together. NULL means follow DEFAULT_DOW.
  assignedDow: number | null;
  // Per-athlete override that does NOT mirror. When set, this athlete
  // does the session on a different weekday than the partner. NULL =
  // follow the shared assignedDow.
  assignedDowPersonal: number | null;
  // Indices into the base plan's day.blocks that the user removed. Shared
  // between athletes (mirror-write on change). Empty = render base plan
  // unchanged.
  deletedBlocks: number[];
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
  assigned_dow: number | null;
  assigned_dow_personal: number | null;
  deleted_blocks: number[] | null;
  updated_at: string | null;
}

const EMPTY: TrainingLog = {
  completed: false,
  rpe: null,
  notes: null,
  customBlocks: {},
  extraBlocks: [],
  weekNote: null,
  assignedDow: null,
  assignedDowPersonal: null,
  deletedBlocks: [],
};

const OTHER: Record<Athlete, Athlete> = { MK: 'Xabi', Xabi: 'MK' };

// Strip undefined values from a row payload so PostgREST never has to
// see them. JSON.stringify already drops them — this just makes intent
// explicit and prevents any defensive code from sending `null` by accident.
function clean<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const k in row) if (row[k] !== undefined) out[k] = row[k];
  return out as T;
}

// Format Supabase / PostgREST error → short string the UI can show.
// PostgrestError shape is { message, code, details, hint }. message
// alone is sometimes empty for constraint violations; combine the
// useful parts.
function fmtErr(e: { message?: string; code?: string; details?: string; hint?: string } | Error): string {
  if (e instanceof Error) return e.message || String(e);
  const parts = [
    e.message,
    e.code ? `(${e.code})` : null,
    e.details,
    e.hint ? `· ${e.hint}` : null,
  ].filter(Boolean);
  return parts.join(' ') || 'unknown';
}

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
        .select('athlete,week,day_key,completed,rpe,notes,custom_blocks,extra_blocks,week_note,assigned_dow,assigned_dow_personal,deleted_blocks,updated_at')
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
        .select('athlete,week,day_key,completed,rpe,notes,custom_blocks,extra_blocks,week_note,assigned_dow,assigned_dow_personal,deleted_blocks,updated_at')
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

        // assigned_dow is shared — latest non-null across the two
        // athletes wins so a tap by either of them moves the session.
        let dow: number | null = null;
        const mineDowTs = mine?.updated_at ?? '';
        const otherDowTs = other?.updated_at ?? '';
        const mineHasDow = mine && mine.assigned_dow != null;
        const otherHasDow = other && other.assigned_dow != null;
        if (mineHasDow && otherHasDow) {
          dow = mineDowTs >= otherDowTs ? mine!.assigned_dow : other!.assigned_dow;
        } else if (mineHasDow) {
          dow = mine!.assigned_dow;
        } else if (otherHasDow) {
          dow = other!.assigned_dow;
        }

        // deleted_blocks shared — union of both athletes' removed indices
        // so a block removed on either device disappears for both.
        const mineDel = (mine?.deleted_blocks ?? []) as number[];
        const otherDel = (other?.deleted_blocks ?? []) as number[];
        const deletedBlocks = Array.from(new Set([...mineDel, ...otherDel])).sort((a, b) => a - b);

        next[dk] = {
          completed: !!mine?.completed,
          rpe: mine?.rpe ?? null,
          notes,
          customBlocks: mine?.custom_blocks ?? {},
          extraBlocks: mine?.extra_blocks ?? [],
          weekNote: sharedWeekNote,
          assignedDow: dow,
          // Personal override is read straight from the current athlete's
          // row — never the partner's. That's the whole point.
          assignedDowPersonal: mine?.assigned_dow_personal ?? null,
          deletedBlocks,
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

      // Surgical upsert: only the columns this patch actually touches
      // travel to the DB. Anything else (notes, week_note, assigned_dow
      // written by the OTHER athlete since we loaded) is left alone.
      // Previously a "completed" toggle would re-send the whole local
      // state and clobber a freshly-written shared note from the other
      // device.
      const has = (k: keyof TrainingLog) => Object.prototype.hasOwnProperty.call(patch, k);
      const ownRow: Record<string, unknown> = {
        athlete,
        week,
        day_key: dayKey,
        updated_at: nowIso,
      };
      if (has('completed'))           ownRow.completed             = merged.completed;
      if (has('rpe'))                 ownRow.rpe                   = merged.rpe;
      if (has('notes'))               ownRow.notes                 = merged.notes;
      if (has('customBlocks'))        ownRow.custom_blocks         = merged.customBlocks;
      if (has('extraBlocks'))         ownRow.extra_blocks          = merged.extraBlocks;
      if (has('weekNote'))            ownRow.week_note             = merged.weekNote;
      if (has('assignedDow'))         ownRow.assigned_dow          = merged.assignedDow;
      if (has('assignedDowPersonal')) ownRow.assigned_dow_personal = merged.assignedDowPersonal;
      if (has('deletedBlocks'))       ownRow.deleted_blocks        = merged.deletedBlocks;

      const { error } = await supabaseClient()
        .from('registros')
        .upsert(clean(ownRow), { onConflict: 'athlete,week,day_key' });
      if (error) {
        saveState.getState().set('error', fmtErr(error));
        return;
      }

      // Mirror SHARED fields to the OTHER athlete. Built the same way —
      // only fields actually in the patch travel.
      const mirrorRow: Record<string, unknown> = {
        athlete: OTHER[athlete],
        week,
        day_key: dayKey,
        updated_at: nowIso,
      };
      let mirrorHasShared = false;
      if (has('notes'))         { mirrorRow.notes          = merged.notes;         mirrorHasShared = true; }
      if (has('weekNote'))      { mirrorRow.week_note      = merged.weekNote;      mirrorHasShared = true; }
      if (has('assignedDow'))   { mirrorRow.assigned_dow   = merged.assignedDow;   mirrorHasShared = true; }
      if (has('deletedBlocks')) { mirrorRow.deleted_blocks = merged.deletedBlocks; mirrorHasShared = true; }
      if (mirrorHasShared) {
        const { error: mirrorErr } = await supabaseClient()
          .from('registros')
          .upsert(clean(mirrorRow), { onConflict: 'athlete,week,day_key' });
        if (mirrorErr) {
          saveState.getState().set('error', fmtErr(mirrorErr));
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

      // Surgical upsert — only week_note + updated_at travel for BOTH
      // athletes. Per-athlete columns (completed/rpe/etc.) stay where
      // they are.
      const ownRows = dayKeys.map((dk) => ({
        athlete,
        week,
        day_key: dk,
        week_note: note,
        updated_at: nowIso,
      }));
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
        .upsert(ownRows, { onConflict: 'athlete,week,day_key' });
      if (error) {
        saveState.getState().set('error', fmtErr(error));
        return;
      }
      const { error: mirrorErr } = await supabaseClient()
        .from('registros')
        .upsert(mirrorRows, { onConflict: 'athlete,week,day_key' });
      if (mirrorErr) {
        saveState.getState().set('error', fmtErr(mirrorErr));
        return;
      }
      saveState.getState().set('saved');
    },
    [athlete, week]
  );

  return { loading, byKey, setLog, setWeekNote };
}
