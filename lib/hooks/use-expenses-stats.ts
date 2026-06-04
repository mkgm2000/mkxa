'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type { Expense, Category, PaidBy } from '@/lib/expenses';

export interface MonthBucket {
  // ISO first day of the month, e.g. '2026-06-01'.
  key: string;
  // Human label, short Spanish month, e.g. 'jun'.
  label: string;
  year: number;
  month: number; // 0-11
  total: number;
}

export interface CategoryTotal {
  category: Category;
  total: number;
}

export interface PaidBySplit {
  MK: number;
  Xabi: number;
  Compartido: number;
}

export interface UseExpensesStatsResult {
  loading: boolean;
  /** Total of the running month. */
  currentTotal: number;
  /** Total of the previous month. */
  previousTotal: number;
  /** Percentage delta vs previous month. null when previous month was 0. */
  pctChange: number | null;
  /** Daily average for the current month so far. */
  currentDailyAvg: number;
  /** Daily average for the previous month (full month). */
  previousDailyAvg: number;
  /** Top category of the current month. */
  currentTopCategory: Category | null;
  /** Top category of the previous month. */
  previousTopCategory: Category | null;
  /** Totals per category in the current month, ranked desc. */
  currentByCategory: CategoryTotal[];
  /** 6 month rolling buckets ordered oldest -> newest (current month is last). */
  trend: MonthBucket[];
  /** Payer split for the current month. */
  paidBy: PaidBySplit;
  /** Total count of expenses considered (last 6 months). */
  count: number;
}

function monthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function shortMonthLabel(d: Date): string {
  return d.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
}

function buildMonthBuckets(now: Date): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({
      key: monthKey(d),
      label: shortMonthLabel(d),
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      total: 0,
    });
  }
  return buckets;
}

/**
 * Pulls the last 6 months of expenses (current month included) and computes
 * the aggregates needed by the dashboard. Read-only — does not mutate data.
 */
export function useExpensesStats(now: Date = new Date()): UseExpensesStatsResult {
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Anchor "now" by its month so we don't refetch on every render. Day-level
  // changes within the same month do not change which buckets we need.
  const anchor = useMemo(
    () => `${now.getUTCFullYear()}-${now.getUTCMonth()}`,
    // We intentionally depend on the anchor string only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { from, to } = useMemo(() => {
    // 6-month window starting on the first day of (current month - 5).
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    const toISO = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    return { from: toISO(start), to: toISO(end) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseClient()
        .from('expenses')
        .select('*')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false });
      if (cancelled) return;
      if (error) {
        saveState.getState().set('error');
        setRows([]);
        setLoading(false);
        return;
      }
      setRows((data ?? []) as Expense[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [from, to]);

  return useMemo<UseExpensesStatsResult>(() => {
    const buckets = buildMonthBuckets(now);
    const currentKey  = buckets[5].key;
    const previousKey = buckets[4].key;

    const byMonthByCategory = new Map<string, Map<Category, number>>();
    const byMonthByPayer    = new Map<string, PaidBySplit>();

    for (const e of rows) {
      // Parse YYYY-MM-DD as a UTC date so we group consistently.
      const [yStr, mStr] = e.date.split('-');
      const y = Number(yStr);
      const m = Number(mStr) - 1;
      const key = `${y}-${String(m + 1).padStart(2, '0')}-01`;

      const amount = Number(e.amount) || 0;

      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.total += amount;

      const catMap = byMonthByCategory.get(key) ?? new Map<Category, number>();
      catMap.set(e.category, (catMap.get(e.category) ?? 0) + amount);
      byMonthByCategory.set(key, catMap);

      const payerSplit =
        byMonthByPayer.get(key) ?? ({ MK: 0, Xabi: 0, Compartido: 0 } as PaidBySplit);
      payerSplit[e.paid_by as PaidBy] += amount;
      byMonthByPayer.set(key, payerSplit);
    }

    const currentTotal  = buckets[5].total;
    const previousTotal = buckets[4].total;

    const pctChange =
      previousTotal === 0
        ? null
        : ((currentTotal - previousTotal) / previousTotal) * 100;

    // Days elapsed in the current month (capped at month length).
    const daysInCurrentMonth = new Date(Date.UTC(buckets[5].year, buckets[5].month + 1, 0)).getUTCDate();
    const elapsedDays = Math.min(
      Math.max(now.getUTCDate(), 1),
      daysInCurrentMonth,
    );
    const daysInPrevMonth = new Date(Date.UTC(buckets[4].year, buckets[4].month + 1, 0)).getUTCDate();

    const currentDailyAvg  = currentTotal  / elapsedDays;
    const previousDailyAvg = previousTotal / daysInPrevMonth;

    function topCat(key: string): Category | null {
      const m = byMonthByCategory.get(key);
      if (!m || m.size === 0) return null;
      let top: Category | null = null;
      let best = -Infinity;
      m.forEach((v, k) => {
        if (v > best) { best = v; top = k; }
      });
      return top;
    }

    const currentTopCategory  = topCat(currentKey);
    const previousTopCategory = topCat(previousKey);

    const currentByCategory: CategoryTotal[] = Array.from(
      (byMonthByCategory.get(currentKey) ?? new Map<Category, number>()).entries(),
    )
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    const paidBy =
      byMonthByPayer.get(currentKey) ?? { MK: 0, Xabi: 0, Compartido: 0 };

    return {
      loading,
      currentTotal,
      previousTotal,
      pctChange,
      currentDailyAvg,
      previousDailyAvg,
      currentTopCategory,
      previousTopCategory,
      currentByCategory,
      trend: buckets,
      paidBy,
      count: rows.length,
    };
    // `now` is stable per render; the anchor effect above ensures we refetch
    // only when the month changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, loading]);
}
