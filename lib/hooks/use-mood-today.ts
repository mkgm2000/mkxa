'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import { todayISO } from '@/lib/date';
import type { Mood } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

export interface MoodLog {
  athlete: Athlete;
  date: string;
  mood: Mood;
  note: string | null;
}

export function useMoodToday(athlete: Athlete | null) {
  const [mood, setMood] = useState<MoodLog | null>(null);
  const [loading, setLoading] = useState<boolean>(athlete !== null);

  useEffect(() => {
    if (!athlete) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const date = todayISO();
      const { data, error } = await supabaseClient()
        .from('mood_logs')
        .select('athlete,date,mood,note')
        .eq('athlete', athlete)
        .eq('date', date)
        .maybeSingle();
      if (cancelled) return;
      if (error) { saveState.getState().set('error'); setLoading(false); return; }
      setMood(data as MoodLog | null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athlete]);

  const save = useCallback(async (m: Mood, note?: string) => {
    if (!athlete) return;
    const date = todayISO();
    saveState.getState().set('saving');
    const { error } = await supabaseClient().from('mood_logs').upsert({
      athlete, date, mood: m, note: note ?? null,
    }, { onConflict: 'athlete,date' });
    if (error) { saveState.getState().set('error'); return; }
    saveState.getState().set('saved');
    setMood({ athlete, date, mood: m, note: note ?? null });
  }, [athlete]);

  return { mood, loading, save };
}
