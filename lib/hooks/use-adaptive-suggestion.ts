'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Athlete } from '@/lib/athlete-context';
import type { RecentRegistro } from '@/lib/training/dynamic-context';
import { suggestAdaptive, computeMetrics, type AdaptiveSuggestion } from '@/lib/training/adaptive';

/**
 * Fetches the most recent registros for the athlete, runs the adaptive
 * decision tree, and returns a suggestion (or null) for the *next* session.
 *
 * `targetWeek` is the week the user is currently viewing — we look at
 * registros from weeks **before** it. If null or <2, the hook is idle.
 */
export function useAdaptiveSuggestion(
  athlete: Athlete | null,
  targetWeek: number | null,
) {
  const [rows, setRows] = useState<RecentRegistro[]>([]);
  const [loading, setLoading] = useState<boolean>(
    athlete !== null && targetWeek !== null,
  );

  useEffect(() => {
    if (!athlete || targetWeek == null || targetWeek < 2) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseClient()
        .from('registros')
        .select('week,day_key,completed,rpe,notes,week_note')
        .eq('athlete', athlete)
        .gte('week', Math.max(1, targetWeek - 4))
        .lte('week', targetWeek - 1)
        .order('week', { ascending: true })
        .order('day_key', { ascending: true });
      if (cancelled) return;
      if (error || !data) {
        setRows([]);
        setLoading(false);
        return;
      }
      setRows(data as RecentRegistro[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [athlete, targetWeek]);

  const suggestion: AdaptiveSuggestion | null = useMemo(() => {
    if (rows.length === 0) return null;
    const s = suggestAdaptive(rows);
    // Dev-mode log so we can manually verify the decision tree.
    if (process.env.NODE_ENV !== 'production') {
      const m = computeMetrics(rows);
      // eslint-disable-next-line no-console
      console.debug('[adaptive]', {
        athlete,
        targetWeek,
        avgRpe: m.avgRpe,
        completionRate: m.completionRate,
        sampleSize: m.sampleSize,
        lastThreeAllHigh: m.lastThreeAllHigh,
        kind: s?.kind ?? null,
      });
    }
    return s;
  }, [rows, athlete, targetWeek]);

  return { suggestion, loading, rows };
}
