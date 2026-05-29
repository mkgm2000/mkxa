'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type { Expense, Category } from '@/lib/expenses';

export interface UseExpensesArgs {
  from: string; // YYYY-MM-DD inclusive
  to: string;   // YYYY-MM-DD inclusive
}

export interface UseExpensesResult {
  data: Expense[];
  loading: boolean;
  total: number;
  totalByCategory: Partial<Record<Category, number>>;
  refresh: () => void;
}

export function useExpenses({ from, to }: UseExpensesArgs): UseExpensesResult {
  const [data, setData] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: rows, error } = await supabaseClient()
        .from('expenses')
        .select('*')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false });
      if (cancelled) return;
      if (error) {
        saveState.getState().set('error');
        setData([]);
        setLoading(false);
        return;
      }
      setData((rows ?? []) as Expense[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [from, to, tick]);

  const total = useMemo(
    () => data.reduce((acc, e) => acc + Number(e.amount), 0),
    [data],
  );

  const totalByCategory = useMemo(() => {
    const out: Partial<Record<Category, number>> = {};
    for (const e of data) {
      out[e.category] = (out[e.category] ?? 0) + Number(e.amount);
    }
    return out;
  }, [data]);

  return {
    data,
    loading,
    total,
    totalByCategory,
    refresh: () => setTick((t) => t + 1),
  };
}
