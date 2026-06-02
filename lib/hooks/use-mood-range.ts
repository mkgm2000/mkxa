'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Mood } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

// Fetch all mood_logs for the athlete from `sinceISO` onwards. /mood uses
// this to render the full year-in-pixels grid. The result map is keyed by
// YYYY-MM-DD so the consumer can look up any day cheaply.
export function useMoodRange(athlete: Athlete | null, sinceISO: string) {
  const [logsByDate, setLogsByDate] = useState<Record<string, Mood>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!athlete) { setLogsByDate({}); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabaseClient()
        .from('mood_logs')
        .select('date,mood')
        .eq('athlete', athlete)
        .gte('date', sinceISO);
      if (cancelled) return;
      if (error) {
        console.error('[useMoodRange] fetch failed', error);
        setLogsByDate({});
      } else {
        const map: Record<string, Mood> = {};
        for (const row of (data ?? []) as { date: string; mood: Mood }[]) {
          map[row.date] = row.mood;
        }
        setLogsByDate(map);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athlete, sinceISO]);

  return { logsByDate, loading };
}
