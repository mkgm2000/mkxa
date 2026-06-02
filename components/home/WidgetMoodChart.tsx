'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { weekDays, todayISO as computeTodayISO } from '@/lib/date';
import { getMoodTokens, type Mood } from '@/lib/moods';
import { CrayonFilter } from '@/components/mood/CrayonFilter';

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
      href="/mood"
      className="block rounded-card bg-white p-4 shadow-card transition-transform duration-150 active:scale-[0.99]"
    >
      <CrayonFilter />

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Mood semana
        </p>
        <p className="text-[11px] font-bold text-ink-muted">Ver historial →</p>
      </div>

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
                  'block h-8 w-8',
                  !m && 'border border-dashed border-ink-soft',
                )}
                style={{
                  borderRadius: 6,
                  background: tokens
                    ? `linear-gradient(135deg, ${tokens.bodyTop} 0%, ${tokens.bodyMid} 60%, ${tokens.bodyBottom} 100%)`
                    : 'transparent',
                  boxShadow: tokens
                    ? 'inset 0 0 0 1px rgba(0,0,0,0.06), inset 0 -1px 2px rgba(0,0,0,0.08)'
                    : undefined,
                  filter: tokens ? 'url(#mkxa-crayon)' : undefined,
                  outline: isToday ? '2px solid #1b1d1f' : undefined,
                  outlineOffset: isToday ? 1 : undefined,
                }}
                aria-label={tokens ? `${LABELS[i]} ${tokens.label}` : `${LABELS[i]} sin registro`}
              />
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
