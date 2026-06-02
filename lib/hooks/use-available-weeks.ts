'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Athlete } from '@/lib/athlete-context';
import { PLAN } from '@/lib/plan-hyrox';

const BASELINE_WEEKS = Object.keys(PLAN).map((k) => Number(k));

// Returns the highest week the user can navigate to: max of static PLAN
// keys and the athlete's confirmed plans in DB. Anything beyond this has
// no baseline AND no Claude plan, so navigating there shows the stale S3
// fallback and confuses users.
export function useMaxAvailableWeek(athlete: Athlete | null): number {
  const [maxWeek, setMaxWeek] = useState<number>(Math.max(...BASELINE_WEEKS));

  useEffect(() => {
    if (!athlete) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabaseClient()
        .from('training_weeks')
        .select('week')
        .eq('athlete', athlete)
        .eq('status', 'confirmed')
        .order('week', { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error) {
        console.error('[useMaxAvailableWeek] fetch failed', error);
        return;
      }
      const highestConfirmed = (data ?? [])[0]?.week ?? 0;
      setMaxWeek(Math.max(...BASELINE_WEEKS, highestConfirmed));
    })();
    return () => { cancelled = true; };
  }, [athlete]);

  return maxWeek;
}
