'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Athlete } from '@/lib/athlete-context';
import type { RecentRegistro } from '@/lib/training/dynamic-context';

export function useRecentRegistros(athlete: Athlete | null, targetWeek: number | null) {
  const [rows, setRows] = useState<RecentRegistro[]>([]);
  const [loading, setLoading] = useState<boolean>(athlete !== null && targetWeek !== null);

  useEffect(() => {
    if (!athlete || targetWeek == null) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseClient()
        .from('registros')
        .select('week,day_key,completed,rpe,notes,week_note')
        .eq('athlete', athlete)
        .gte('week', 1)
        .lte('week', targetWeek - 1)
        .order('week', { ascending: true });
      if (cancelled) return;
      if (error || !data) { setRows([]); setLoading(false); return; }
      setRows(data as RecentRegistro[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athlete, targetWeek]);

  return { rows, loading };
}
