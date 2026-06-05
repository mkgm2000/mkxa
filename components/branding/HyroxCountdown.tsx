'use client';

import { useEffect, useState } from 'react';

// Visualises the prep block as a dot grid, one dot per day, in the
// style of the lock-screen countdown widget MK keeps as her wallpaper.
// Elapsed days are light, today is a single orange dot, remaining
// days are dimmed. Total span = START_DATE → RACE_DATE.

const START_DATE = new Date('2026-05-11T00:00:00Z');
const RACE_DATE  = new Date('2026-10-16T00:00:00Z');
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const COLS = 14;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export function HyroxCountdown({ compact = false }: { compact?: boolean }) {
  // Render-on-mount so SSR doesn't ship stale day counts.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(todayUTC()); }, []);

  const total = daysBetween(START_DATE, RACE_DATE);
  const elapsed = now ? Math.max(0, Math.min(total, daysBetween(START_DATE, now))) : 0;
  const left = Math.max(0, total - elapsed);
  const pct = Math.round((elapsed / total) * 100);
  const rows = Math.ceil(total / COLS);

  return (
    <section
      aria-label={`Cuenta atrás HYROX: ${left} días restantes`}
      className={compact ? 'flex flex-col items-center gap-2' : 'flex flex-col items-center gap-3'}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
        HYROX
      </p>
      <div
        className="grid gap-[5px]"
        style={{ gridTemplateColumns: `repeat(${COLS}, ${compact ? 7 : 8}px)` }}
        aria-hidden
      >
        {Array.from({ length: rows * COLS }).map((_, i) => {
          const beyond = i >= total;
          const isToday = i === elapsed;
          const isPast = i < elapsed;
          const size = compact ? 7 : 8;
          let cls = 'rounded-full';
          if (beyond) cls += ' bg-transparent';
          else if (isToday) cls += ' bg-[#ff7a3d]';
          else if (isPast) cls += ' bg-white/90';
          else cls += ' bg-white/15';
          return <span key={i} className={cls} style={{ width: size, height: size }} />;
        })}
      </div>
      {now && (
        <p className="flex items-baseline gap-1.5 text-[12px] font-bold tabular-nums">
          <span className="text-[#ff7a3d]">{left}d left</span>
          <span className="text-white/55">·</span>
          <span className="text-white/55">{pct}%</span>
        </p>
      )}
    </section>
  );
}
