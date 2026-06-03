'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Athlete } from '@/lib/athlete-context';

export type AthleteProfileMap = Record<Athlete, { avatar_url: string | null } | null>;

// Loads both MK + Xabi avatars in one shot. The notification bell needs
// both at once so it can render each row's avatar based on who acted,
// not just the currently logged-in athlete.
export function useAthleteProfiles() {
  const [profiles, setProfiles] = useState<AthleteProfileMap>({ MK: null, Xabi: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabaseClient()
        .from('athlete_profiles')
        .select('athlete,avatar_url');
      if (cancelled || !data) return;
      const next: AthleteProfileMap = { MK: null, Xabi: null };
      for (const row of data as { athlete: Athlete; avatar_url: string | null }[]) {
        next[row.athlete] = { avatar_url: row.avatar_url };
      }
      setProfiles(next);
    })();
    return () => { cancelled = true; };
  }, []);

  return profiles;
}
