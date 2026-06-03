'use client';

import clsx from 'clsx';
import { MOOD_ORDER, getMoodTokens, type Mood } from '@/lib/moods';
import { MoodFace } from './MoodFace';

export type RangeKind = 'week' | 'month' | 'year';

interface Props {
  /** ISO YYYY-MM-DD → mood for that date. Missing days = blank cell. */
  logsByDate: Record<string, Mood>;
  range: RangeKind;
  /** Reference date that anchors the displayed window (defaults to today). */
  anchorISO?: string;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayISO(): string {
  return toISO(new Date());
}
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  x.setDate(x.getDate() - back);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_LONG = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// Mood cell. The visual is the app's pastel mood gradient (cardFrom → cardTo)
// the same one used as the page background in the mood check-in flow — so the
// year-in-pixels reads as a recap of those days rather than a foreign chart.
function Cell({
  mood,
  size,
  radius,
  isToday,
  title,
  className,
}: {
  mood: Mood | undefined;
  size: number;
  radius?: number;
  isToday?: boolean;
  title: string;
  className?: string;
}) {
  const t = mood ? getMoodTokens(mood) : null;
  const r = radius ?? Math.max(4, Math.round(size * 0.22));
  return (
    <span
      title={title}
      aria-label={title}
      className={clsx('block transition-transform duration-150 active:scale-95', className)}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: t
          ? `linear-gradient(135deg, ${t.cardFrom} 0%, ${t.cardTo} 100%)`
          : 'rgba(27,29,31,0.05)',
        boxShadow: isToday
          ? '0 0 0 2px #1b1d1f, 0 0 0 4px rgba(255,255,255,0.95)'
          : t
            ? 'inset 0 -1px 2px rgba(0,0,0,0.06)'
            : undefined,
      }}
    />
  );
}

export function YearInPixels({ logsByDate, range, anchorISO }: Props) {
  const anchor = anchorISO ? parseISO(anchorISO) : new Date();
  if (range === 'week') return <WeekView anchor={anchor} logsByDate={logsByDate} />;
  if (range === 'month') return <MonthView anchor={anchor} logsByDate={logsByDate} />;
  return <YearView anchor={anchor} logsByDate={logsByDate} />;
}

function WeekView({ anchor, logsByDate }: { anchor: Date; logsByDate: Record<string, Mood> }) {
  const start = startOfWeek(anchor);
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return (
    <div className="grid grid-cols-7 gap-2.5">
      {days.map((d, i) => {
        const iso = toISO(d);
        const t = logsByDate[iso] ? getMoodTokens(logsByDate[iso]) : null;
        return (
          <div key={iso} className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              {DOW[i]}
            </span>
            <Cell
              mood={logsByDate[iso]}
              size={44}
              isToday={iso === today}
              title={`${iso} · ${t ? t.label : 'sin registro'}`}
            />
            <span className="text-[11px] font-bold tabular-nums text-ink">{d.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ anchor, logsByDate }: { anchor: Date; logsByDate: Record<string, Mood> }) {
  const today = todayISO();
  const y = anchor.getFullYear();
  const m0 = anchor.getMonth();
  const total = daysInMonth(y, m0);
  const firstDow = new Date(y, m0, 1).getDay();
  const leading = firstDow === 0 ? 6 : firstDow - 1;

  return (
    <div className="flex flex-col gap-3">
      <p className="font-sans text-[20px] font-extrabold capitalize tracking-tightest text-ink">
        {MONTH_LONG[m0]}{' '}
        <span className="text-ink-muted">{y}</span>
      </p>
      <div className="grid grid-cols-7 gap-2">
        {DOW.map((l) => (
          <span key={l} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            {l}
          </span>
        ))}
        {Array.from({ length: leading }).map((_, i) => (
          <span key={`b${i}`} aria-hidden className="block" style={{ height: 44 }} />
        ))}
        {Array.from({ length: total }).map((_, i) => {
          const day = i + 1;
          const iso = `${y}-${String(m0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const t = logsByDate[iso] ? getMoodTokens(logsByDate[iso]) : null;
          return (
            <div key={iso} className="relative" style={{ height: 44 }}>
              <Cell
                mood={logsByDate[iso]}
                size={44}
                isToday={iso === today}
                title={`${iso} · ${t ? t.label : 'sin registro'}`}
              />
              <span
                className="pointer-events-none absolute inset-x-0 top-1 text-center text-[10px] font-bold tabular-nums"
                style={{ color: t ? 'rgba(27,29,31,0.55)' : 'rgba(27,29,31,0.35)' }}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({ anchor, logsByDate }: { anchor: Date; logsByDate: Record<string, Mood> }) {
  const today = todayISO();
  const y = anchor.getFullYear();

  // GitHub-contributions-style: months as rows, days 1..31 as columns. Reads
  // left-to-right like a calendar, scrolls horizontally on narrow phones.
  const cell = 13;
  const gap = 3;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">
        {y}
      </p>
      <div className="overflow-x-auto pb-1">
        <div className="flex flex-col gap-1.5">
          {/* Day-number header strip */}
          <div
            className="grid items-center"
            style={{
              gridTemplateColumns: `32px repeat(31, ${cell}px)`,
              columnGap: gap,
            }}
          >
            <span />
            {Array.from({ length: 31 }).map((_, i) => {
              const day = i + 1;
              // Only label every 5th day to keep the header light.
              const show = day === 1 || day % 5 === 0;
              return (
                <span
                  key={day}
                  className="text-center text-[9px] font-bold tabular-nums text-ink-muted"
                  style={{ width: cell }}
                >
                  {show ? day : ''}
                </span>
              );
            })}
          </div>
          {/* One row per month */}
          {Array.from({ length: 12 }).map((_, m0) => {
            const dim = daysInMonth(y, m0);
            return (
              <div
                key={m0}
                className="grid items-center"
                style={{
                  gridTemplateColumns: `32px repeat(31, ${cell}px)`,
                  columnGap: gap,
                  rowGap: 0,
                }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  {MONTH_SHORT[m0]}
                </span>
                {Array.from({ length: 31 }).map((_, di) => {
                  const day = di + 1;
                  if (day > dim) {
                    return <span key={`b-${m0}-${day}`} aria-hidden style={{ width: cell, height: cell }} />;
                  }
                  const iso = `${y}-${String(m0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const t = logsByDate[iso] ? getMoodTokens(logsByDate[iso]) : null;
                  return (
                    <Cell
                      key={iso}
                      mood={logsByDate[iso]}
                      size={cell}
                      radius={3}
                      isToday={iso === today}
                      title={`${iso} · ${t ? t.label : 'sin registro'}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Legend showing each mood's hand-drawn face + Spanish label. Matches the
// MoodFace renderer used in the /mood calendar so what users see in the
// legend is exactly what fills a logged day.
export function MoodLegend() {
  return (
    <ul className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4">
      {MOOD_ORDER.map((m) => {
        const t = getMoodTokens(m);
        return (
          <li key={m} className="flex flex-col items-center gap-1">
            <MoodFace mood={m} size={44} />
            <span className="text-[11px] font-bold text-ink">{t.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
