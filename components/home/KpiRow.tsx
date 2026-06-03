'use client';

import { useMemo } from 'react';
import { useAthlete } from '@/lib/athlete-context';
import { getCurrentWeek } from '@/lib/plan-hyrox';
import { useTrainingAll } from '@/lib/hooks/use-training-all';
import { useTraining } from '@/lib/hooks/use-training';
import { useExpenses } from '@/lib/hooks/use-expenses';
import { getDays } from '@/lib/plan-hyrox';

const KEYS = ['D1', 'D2', 'D3', 'D4'] as const;

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return {
    from: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10),
  };
}

// 3-column KPI strip pinned under the greeting on /home. No card chrome —
// numbers sit directly on the mood gradient with thin dividers, the look
// the user picked in the home redesign brainstorm. Each value is the same
// data already shown in the previous widgets, just reshaped.
export function KpiRow() {
  const athlete = useAthlete();
  const week = getCurrentWeek();
  const { rows } = useTrainingAll(athlete, week);
  const { byKey } = useTraining(athlete, week);
  const { from, to } = useMemo(monthRange, []);
  const { total: monthTotal } = useExpenses({ from, to });

  const totalSessions = useMemo(() => {
    let n = 0;
    for (const r of rows) for (const k of KEYS) if (r[k]?.completed) n++;
    return n;
  }, [rows]);

  const weekStats = useMemo(() => {
    if (!athlete) return { done: 0, total: 4 };
    const days = getDays(week, athlete);
    const done = days.filter((d) => byKey[d.key]?.completed).length;
    return { done, total: days.length };
  }, [athlete, week, byKey]);

  const eur = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(monthTotal || 0);

  const monthLabel = useMemo(() => {
    return new Date()
      .toLocaleString('es-ES', { month: 'long' })
      .toLowerCase();
  }, []);

  return (
    <section className="px-5">
      <div className="grid grid-cols-3 items-center gap-1">
        <Stat value={String(totalSessions)} primary="total" secondary="ses." />
        <Stat value={`${weekStats.done}/${weekStats.total}`} primary="semana" secondary="sesiones" divided />
        <Stat value={eur} primary={monthLabel} secondary="gasto" />
      </div>
    </section>
  );
}

function Stat({
  value,
  primary,
  secondary,
  divided,
}: {
  value: string;
  primary: string;
  secondary: string;
  divided?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center"
      style={divided ? { borderLeft: '1px solid rgba(27,29,31,0.08)', borderRight: '1px solid rgba(27,29,31,0.08)' } : undefined}
    >
      <p className="font-sans text-[28px] font-extrabold leading-none tabular-nums text-ink">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
        {primary}
      </p>
      <p className="text-[10px] text-ink-muted">{secondary}</p>
    </div>
  );
}
