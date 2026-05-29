'use client';

import Link from 'next/link';
import { Flame } from 'lucide-react';
import { useAthlete } from '@/lib/athlete-context';
import { getCurrentWeek } from '@/lib/plan-hyrox';
import { useTrainingAll } from '@/lib/hooks/use-training-all';
import type { HeatRow } from '@/components/training/ProgressHeatmap';

function computeStreak(rows: HeatRow[]): number {
  let n = 0;
  for (const r of rows) {
    for (const k of ['D1', 'D2', 'D3', 'D4'] as const) {
      if (r[k]?.completed) n++;
    }
  }
  return n;
}

export function WidgetTrainingStreak() {
  const athlete = useAthlete();
  const week = getCurrentWeek();
  const { rows } = useTrainingAll(athlete, week);
  const streak = computeStreak(rows);

  return (
    <Link
      href="/training/progress"
      className="mx-5 flex items-center justify-between rounded-card bg-white p-5 shadow-card transition-transform duration-150 active:scale-[0.99]"
    >
      <div>
        <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          <Flame size={11} strokeWidth={1.5} aria-hidden />
          Sesiones completadas
        </p>
        <p className="mt-1 font-sans text-[32px] font-extrabold leading-none tabular-nums text-ink">
          {streak}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-muted">en todo el plan</p>
      </div>
      <Flame size={28} strokeWidth={1.5} className="text-ink" aria-hidden />
    </Link>
  );
}
