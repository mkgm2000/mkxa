'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { weekDays, todayISO as computeTodayISO } from '@/lib/date';
import { getMoodTokens, type Mood } from '@/lib/moods';

const LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface Props {
  weekStartISO: string;
  todayISO?: string;
  logsByDate: Record<string, Mood>;
}

export function WidgetMoodChart({ weekStartISO, todayISO, logsByDate }: Props) {
  const days = weekDays(weekStartISO);
  const resolvedTodayISO = todayISO ?? computeTodayISO();
  const today = logsByDate[resolvedTodayISO];
  const todayLabel = today ? getMoodTokens(today).label : '—';

  return (
    <Link
      href="/profile"
      className="block rounded-card bg-white p-4 shadow-card transition-transform duration-150 active:scale-[0.99]"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        Mood semana
      </p>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((iso, i) => {
          const m = logsByDate[iso];
          const isToday = iso === resolvedTodayISO;
          const tokens = m ? getMoodTokens(m) : null;
          return (
            <div key={iso} className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-ink-muted">{LABELS[i]}</span>
              <span
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-full leading-none',
                  !m && 'border border-dashed border-ink-soft',
                  isToday && 'ring-2 ring-ink ring-offset-1 ring-offset-white',
                )}
                style={{ backgroundColor: tokens ? tokens.bodyMid : 'transparent' }}
                aria-label={tokens ? `${LABELS[i]} ${tokens.label}` : `${LABELS[i]} sin registro`}
              >
                {tokens && (
                  <span aria-hidden="true" className="text-[14px] leading-none">
                    {tokens.emoji}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[12px] text-ink-muted">
        Hoy: <span className="font-medium text-ink">{todayLabel}</span>
      </p>
    </Link>
  );
}
