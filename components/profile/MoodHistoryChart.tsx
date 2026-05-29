'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { MOODS, type Mood, getMoodTokens } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

const ORDER: Record<Mood, number> = MOODS.reduce((acc, m, idx) => { acc[m] = idx; return acc; }, {} as Record<Mood, number>);

interface Row { date: string; mood: Mood }

export function MoodHistoryChart({ athlete }: { athlete: Athlete }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const sinceISO = since.toISOString().slice(0, 10);
      const { data } = await supabaseClient()
        .from('mood_logs')
        .select('date,mood')
        .eq('athlete', athlete)
        .gte('date', sinceISO)
        .order('date');
      if (cancelled || !data) return;
      setRows(data as Row[]);
    })();
    return () => { cancelled = true; };
  }, [athlete]);

  if (rows.length === 0) {
    return (
      <div className="mx-5 rounded-card bg-white p-5 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Histórico</p>
        <p className="mt-2 text-[13px] text-ink-muted">Aún no hay suficientes registros.</p>
      </div>
    );
  }

  const points = rows.map((r, i) => {
    const x = rows.length === 1 ? 50 : (i / (rows.length - 1)) * 100;
    const y = (1 - ORDER[r.mood] / (MOODS.length - 1)) * 100;
    return { x, y, mood: r.mood };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <section className="mx-5 rounded-card bg-white p-5 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Mood últimas 2 semanas</p>
      <div className="mt-3 h-24 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <path d={path} fill="none" stroke="#b587fb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill={getMoodTokens(p.mood).bodyMid} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </div>
    </section>
  );
}
