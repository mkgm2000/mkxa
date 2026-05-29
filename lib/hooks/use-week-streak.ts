'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { getCurrentWeek } from '@/lib/plan-hyrox';
import { computeWeekStreak, type CompletedRow } from '@/lib/streak';
import type { Athlete } from '@/lib/athlete-context';

export function useWeekStreak(athlete: Athlete | null) {
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(athlete !== null);

  useEffect(() => {
    if (!athlete) { setStreak(0); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseClient()
        .from('registros')
        .select('week,day_key,completed')
        .eq('athlete', athlete);
      if (cancelled) return;
      if (error || !data) { setStreak(0); setLoading(false); return; }
      setStreak(computeWeekStreak(data as CompletedRow[], getCurrentWeek()));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athlete]);

  return { streak, loading };
}
