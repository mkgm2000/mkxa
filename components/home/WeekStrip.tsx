'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { useMemo } from 'react';
import { useAthlete } from '@/lib/athlete-context';
import { useMoodRange } from '@/lib/hooks/use-mood-range';
import { getMoodTokens, type Mood } from '@/lib/moods';

const DOW_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Calendar pill strip inspired by the doctor-app reference: each weekday is
// a vertically-stacked pill (weekday label + day number) and today is the
// highlighted gold pill. We use the mood gradient on the highlighted pill
// so the row is also a recap of how the user feels today.
export function WeekStrip() {
  const athlete = useAthlete();
  const today = useMemo(() => new Date(), []);
  // Start at Monday (matches the rest of the app).
  const monday = useMemo(() => {
    const d = new Date(today);
    const dow = d.getDay();
    const back = dow === 0 ? 6 : dow - 1;
    d.setDate(d.getDate() - back);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    }),
    [monday],
  );
  const monthStartISO = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }, [today]);
  const { logsByDate } = useMoodRange(athlete, monthStartISO);

  const todayISO = toISO(today);

  return (
    <Link
      href="/mood"
      aria-label="Ver historial de mood"
      className="grid grid-cols-7 gap-1.5 px-5"
    >
      {days.map((d, i) => {
        const iso = toISO(d);
        const isToday = iso === todayISO;
        const mood = logsByDate[iso] as Mood | undefined;
        const tokens = mood ? getMoodTokens(mood) : null;
        return (
          <div
            key={iso}
            className={clsx(
              'flex flex-col items-center gap-1.5 rounded-full py-2 transition-transform duration-150',
              isToday ? 'shadow-card' : 'shadow-action',
            )}
            style={{
              background: isToday && tokens
                ? `linear-gradient(180deg, ${tokens.cardFrom} 0%, ${tokens.cardTo} 100%)`
                : isToday
                  ? 'linear-gradient(180deg, #fff4d8 0%, #ffd987 100%)'
                  : 'white',
            }}
          >
            <span
              className={clsx(
                'text-[11px] font-bold uppercase tracking-wider',
                isToday ? 'text-ink' : 'text-ink-muted',
              )}
            >
              {DOW_SHORT[i]}
            </span>
            <span
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full font-sans text-[15px] font-extrabold tabular-nums',
                isToday ? 'bg-white text-ink shadow-action' : 'text-ink',
              )}
            >
              {d.getDate()}
            </span>
          </div>
        );
      })}
    </Link>
  );
}
