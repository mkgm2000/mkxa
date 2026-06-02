'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';
import { getMoodTokens, type Mood } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

interface MoodRow { date: string; mood: Mood }

function isoBack(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function dayNum(iso: string): string {
  return iso.slice(-2);
}

export function MoodHistoryChart({ athlete }: { athlete: Athlete }) {
  const [logsByDate, setLogsByDate] = useState<Record<string, Mood>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = isoBack(13);
      const { data } = await supabaseClient()
        .from('mood_logs')
        .select('date,mood')
        .eq('athlete', athlete)
        .gte('date', since)
        .order('date');
      if (cancelled || !data) return;
      const map: Record<string, Mood> = {};
      for (const r of data as MoodRow[]) map[r.date] = r.mood;
      setLogsByDate(map);
    })();
    return () => { cancelled = true; };
  }, [athlete]);

  const today = isoBack(0);
  const days: string[] = Array.from({ length: 14 }, (_, i) => isoBack(13 - i));
  const firstRow = days.slice(0, 7);
  const secondRow = days.slice(7);
  const logged = Object.keys(logsByDate).filter((d) => days.includes(d)).length;

  function DayRow({ row }: { row: string[] }) {
    return (
      <div className="grid grid-cols-7 gap-2 px-1">
        {row.map((iso) => {
          const m = logsByDate[iso];
          const t = m ? getMoodTokens(m) : null;
          const isToday = iso === today;
          return (
            <div key={iso} className="flex flex-col items-center gap-1">
              <span
                data-testid="mood-cell"
                className={clsx('block aspect-square w-full', !t && 'bg-ink-soft')}
                style={{
                  borderRadius: 8,
                  background: t
                    ? `linear-gradient(135deg, ${t.cardFrom} 0%, ${t.cardTo} 100%)`
                    : undefined,
                  boxShadow: isToday
                    ? '0 0 0 2px #1b1d1f, 0 0 0 4px rgba(255,255,255,0.95)'
                    : t
                      ? 'inset 0 -1px 2px rgba(0,0,0,0.06)'
                      : undefined,
                }}
                aria-label={t ? `${iso} ${t.label}` : `${iso} sin registro`}
              />
              <span className="text-[9px] font-bold text-ink-muted">{dayNum(iso)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Link
      href="/mood"
      className="mx-5 block rounded-card bg-white p-4 shadow-card transition-transform duration-150 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Mood últimas 2 semanas
        </p>
        <ArrowUpRight size={14} strokeWidth={1.5} className="text-ink-muted" aria-hidden />
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <DayRow row={firstRow} />
        <DayRow row={secondRow} />
      </div>
      <p className="mt-3 text-[12px] text-ink-muted">
        {logged} de 14 días con registro · <span className="font-medium text-ink">Ver año completo</span>
      </p>
    </Link>
  );
}
