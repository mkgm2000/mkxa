'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { startOfWeekISO } from '@/lib/date';
import type { Mood } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

export function useMoodWeek(athlete: Athlete | null) {
  const [weekStartISO] = useState(() => startOfWeekISO(new Date()));
  const [logsByDate, setLogsByDate] = useState<Record<string, Mood>>({});

  useEffect(() => {
    if (!athlete) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabaseClient()
        .from('mood_logs')
        .select('date,mood')
        .eq('athlete', athlete)
        .gte('date', weekStartISO);
      if (cancelled || error || !data) return;
      const map: Record<string, Mood> = {};
      for (const row of data as { date: string; mood: Mood }[]) {
        map[row.date] = row.mood;
      }
      setLogsByDate(map);
    })();
    return () => { cancelled = true; };
  }, [athlete, weekStartISO]);

  return { weekStartISO, logsByDate };
}
