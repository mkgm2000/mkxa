'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Athlete } from '@/lib/athlete-context';
import type { GeneratedWeek } from '@/lib/training/generated';

export function useConfirmedWeek(athlete: Athlete | null, week: number | null) {
  const [plan, setPlan] = useState<GeneratedWeek | null>(null);
  const [loading, setLoading] = useState<boolean>(athlete !== null && week !== null);

  const fetchOnce = useCallback(async () => {
    if (!athlete || week == null) { setPlan(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabaseClient()
      .from('training_weeks')
      .select('plan_jsonb')
      .eq('athlete', athlete)
      .eq('week', week)
      .eq('status', 'confirmed')
      .maybeSingle();
    if (error || !data) { setPlan(null); setLoading(false); return; }
    const p = (data as { plan_jsonb: GeneratedWeek }).plan_jsonb;
    setPlan(p);
    setLoading(false);
  }, [athlete, week]);

  useEffect(() => { void fetchOnce(); }, [fetchOnce]);

  // Refresh on tab refocus / when the page becomes visible again. This is the
  // path that catches "user accepted plan in adjust, navigated back here":
  // even though the route didn't remount, the visibility change forces a
  // re-fetch of the latest confirmed plan so the new week shows up.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void fetchOnce();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [fetchOnce]);

  return { plan, loading, refresh: fetchOnce };
}
