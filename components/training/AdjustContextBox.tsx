'use client';

import { useRecentRegistros } from '@/lib/hooks/use-recent-registros';
import type { Athlete } from '@/lib/athlete-context';

export function AdjustContextBox({ athlete, week }: { athlete: Athlete; week: number }) {
  const { rows, loading } = useRecentRegistros(athlete, week);
  if (loading) {
    return <p className="text-[13px] text-ink-muted">Cargando contexto…</p>;
  }
  const byWeek = new Map<number, typeof rows>();
  for (const r of rows) {
    const arr = byWeek.get(r.week) ?? [];
    arr.push(r);
    byWeek.set(r.week, arr);
  }
  const weeks = Array.from(byWeek.keys()).sort((a, b) => a - b);
  if (weeks.length === 0) {
    return <p className="text-[13px] text-ink-muted">Sin registros previos.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {weeks.map((w) => {
        const rs = byWeek.get(w) ?? [];
        const completed = rs.filter((r) => r.completed === true).length;
        const rpes = rs.map((r) => r.rpe).filter((x): x is number => typeof x === 'number');
        const avg = rpes.length > 0 ? (rpes.reduce((s, x) => s + x, 0) / rpes.length) : null;
        const weekNote = rs.map((r) => r.week_note).find((x): x is string => !!x) ?? '';
        return (
          <div key={w} className="rounded-card bg-white p-3 shadow-item">
            <p className="text-[12px] font-bold text-ink">S{w} — {completed}/4 sesiones</p>
            {avg != null && <p className="text-[12px] text-ink-muted">RPE medio: {avg.toFixed(1)}</p>}
            {weekNote && <p className="mt-1 line-clamp-3 text-[12px] text-ink-muted">{weekNote}</p>}
          </div>
        );
      })}
    </div>
  );
}
