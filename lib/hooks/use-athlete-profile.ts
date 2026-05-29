'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Athlete } from '@/lib/athlete-context';

export interface AthleteProfile {
  athlete: Athlete;
  avatar_url: string | null;
}

export function useAthleteProfile(athlete: Athlete | null) {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(athlete !== null);

  const refresh = useCallback(async () => {
    if (!athlete) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabaseClient()
      .from('athlete_profiles')
      .select('athlete,avatar_url')
      .eq('athlete', athlete)
      .maybeSingle();
    if (error) { setLoading(false); return; }
    setProfile(data as AthleteProfile | null);
    setLoading(false);
  }, [athlete]);

  useEffect(() => { refresh(); }, [refresh]);

  return { profile, loading, refresh };
}
