'use client';

import { useEffect, useState } from 'react';

// Dot-grid prep countdown: one dot per day from START_DATE to RACE_DATE.
// Used both as a standalone widget and inside HyroxGate (the daily
// reminder popup). Style follows the cream/ink app palette — not the
// dark wallpaper original — so it sits naturally over mood gradients.

export const HYROX_START_DATE = new Date('2026-05-11T00:00:00Z');
export const HYROX_RACE_DATE  = new Date('2026-10-16T00:00:00Z');
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const COLS = 14;
const ACCENT = '#ff6a2a'; // warm orange, anchors to the cat.ocio/danger family

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export function getHyroxDaysLeft(): number {
  const total = daysBetween(HYROX_START_DATE, HYROX_RACE_DATE);
  const elapsed = Math.max(0, Math.min(total, daysBetween(HYROX_START_DATE, todayUTC())));
  return Math.max(0, total - elapsed);
}

interface HyroxCountdownProps {
  /** dot diameter in px */
  size?: number;
  /** if true, hide HYROX header label */
  hideHeader?: boolean;
}

export function HyroxCountdown({ size = 10, hideHeader = false }: HyroxCountdownProps) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(todayUTC()); }, []);

  const total = daysBetween(HYROX_START_DATE, HYROX_RACE_DATE);
  const elapsed = now ? Math.max(0, Math.min(total, daysBetween(HYROX_START_DATE, now))) : 0;
  const left = Math.max(0, total - elapsed);
  const pct = Math.round((elapsed / total) * 100);
  const rows = Math.ceil(total / COLS);

  return (
    <div className="flex flex-col items-center gap-4">
      {!hideHeader && (
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-ink-muted">
          HYROX · 16 oct 2026
        </p>
      )}

      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, ${size}px)`,
          gap: Math.max(4, Math.round(size * 0.55)),
        }}
        aria-hidden
      >
        {Array.from({ length: rows * COLS }).map((_, i) => {
          const beyond = i >= total;
          const isToday = i === elapsed;
          const isPast = i < elapsed;
          let bg = 'transparent';
          if (isToday) bg = ACCENT;
          else if (isPast) bg = '#1b1d1f';
          else if (!beyond) bg = 'rgba(27,29,31,0.14)';
          return (
            <span
              key={i}
              className="rounded-full"
              style={{ width: size, height: size, backgroundColor: bg }}
            />
          );
        })}
      </div>

      {now && (
        <p className="flex items-baseline gap-2 font-sans tabular-nums">
          <span className="text-[34px] font-extrabold leading-none tracking-tightest" style={{ color: ACCENT }}>
            {left}
          </span>
          <span className="text-[14px] font-bold text-ink">días left</span>
          <span className="text-[14px] font-bold text-ink-muted">·</span>
          <span className="text-[14px] font-bold text-ink-muted">{pct}%</span>
        </p>
      )}
    </div>
  );
}
