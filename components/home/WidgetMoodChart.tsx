'use client';

import { useMemo } from 'react';
import { weekDays } from '@/lib/date';
import { getMoodTokens, MOODS, type Mood } from '@/lib/moods';

interface Props {
  weekStartISO: string;
  logsByDate: Record<string, Mood>;
}

const ORDER: Record<Mood, number> = MOODS.reduce((acc, m, idx) => {
  acc[m] = idx; return acc;
}, {} as Record<Mood, number>);

export function WidgetMoodChart({ weekStartISO, logsByDate }: Props) {
  const days = weekDays(weekStartISO);
  const data = days.map((d) => {
    const m = logsByDate[d];
    return { d, m, score: m ? ORDER[m] : null };
  });

  const points = useMemo(() => {
    const pts = data
      .map((p, i) => ({ x: (i / 6) * 100, y: p.score == null ? null : (1 - p.score / (MOODS.length - 1)) * 100 }))
      .filter((p): p is { x: number; y: number } => p.y !== null);
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [data]);

  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        Mood semana
      </p>
      <div className="mt-3 h-12 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          {points && (
            <path d={points} fill="none" stroke="#1b1d1f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          )}
          {data.map((p, i) => {
            if (p.m == null) return null;
            const x = (i / 6) * 100;
            const y = (1 - ORDER[p.m] / (MOODS.length - 1)) * 100;
            return (
              <circle key={i} cx={x} cy={y} r={3} fill={getMoodTokens(p.m).bodyMid} vectorEffect="non-scaling-stroke" />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
