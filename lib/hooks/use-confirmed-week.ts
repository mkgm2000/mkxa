'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Athlete } from '@/lib/athlete-context';
import type { GeneratedWeek } from '@/lib/training/generated';

export function useConfirmedWeek(athlete: Athlete | null, week: number | null) {
  const [plan, setPlan] = useState<GeneratedWeek | null>(null);
  const [loading, setLoading] = useState<boolean>(athlete !== null && week !== null);

  useEffect(() => {
    if (!athlete || week == null) { setPlan(null); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseClient()
        .from('training_weeks')
        .select('plan_jsonb')
        .eq('athlete', athlete)
        .eq('week', week)
        .eq('status', 'confirmed')
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setPlan(null); setLoading(false); return; }
      const p = (data as { plan_jsonb: GeneratedWeek }).plan_jsonb;
      setPlan(p);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athlete, week]);

  return { plan, loading };
}
