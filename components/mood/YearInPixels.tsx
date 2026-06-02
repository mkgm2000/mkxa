'use client';

import { MOOD_ORDER, getMoodTokens, type Mood } from '@/lib/moods';

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
// Monday-start week index (matches the rest of the app).
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay(); // 0 = Sun
  const back = dow === 0 ? 6 : dow - 1;
  x.setDate(x.getDate() - back);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

const DOW_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_LABELS_LONG = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_LABELS_SHORT = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function MoodCell({
  mood,
  size,
  isToday,
  title,
}: {
  mood: Mood | undefined;
  size: number;
  isToday?: boolean;
  title: string;
}) {
  const tokens = mood ? getMoodTokens(mood) : null;
  return (
    <div
      title={title}
      aria-label={title}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(3, Math.round(size * 0.15)),
        background: tokens
          ? `linear-gradient(135deg, ${tokens.bodyTop} 0%, ${tokens.bodyMid} 60%, ${tokens.bodyBottom} 100%)`
          : 'transparent',
        boxShadow: tokens
          ? 'inset 0 0 0 1px rgba(0,0,0,0.06), inset 0 -1px 2px rgba(0,0,0,0.08)'
          : 'inset 0 0 0 1px rgba(27,29,31,0.12)',
        filter: tokens ? 'url(#mkxa-crayon)' : undefined,
        outline: isToday ? '2px solid #1b1d1f' : undefined,
        outlineOffset: isToday ? 1 : undefined,
      }}
    />
  );
}

export function YearInPixels({ logsByDate, range, anchorISO }: Props) {
  const anchor = anchorISO ? parseISO(anchorISO) : new Date();
  const today = todayISO();

  if (range === 'week') return <WeekGrid anchor={anchor} logsByDate={logsByDate} today={today} />;
  if (range === 'month') return <MonthGrid anchor={anchor} logsByDate={logsByDate} today={today} />;
  return <YearGrid anchor={anchor} logsByDate={logsByDate} today={today} />;
}

function WeekGrid({ anchor, logsByDate, today }: { anchor: Date; logsByDate: Record<string, Mood>; today: string }) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d, i) => {
        const iso = toISO(d);
        return (
          <div key={iso} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              {DOW_LABELS[i]}
            </span>
            <MoodCell
              mood={logsByDate[iso]}
              size={40}
              isToday={iso === today}
              title={`${iso} · ${logsByDate[iso] ? getMoodTokens(logsByDate[iso]).label : 'sin registro'}`}
            />
            <span className="text-[10px] font-bold tabular-nums text-ink">{d.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({ anchor, logsByDate, today }: { anchor: Date; logsByDate: Record<string, Mood>; today: string }) {
  const y = anchor.getFullYear();
  const m0 = anchor.getMonth();
  const total = daysInMonth(y, m0);
  // Leading blanks so day 1 lands on the right column based on weekday.
  const first = new Date(y, m0, 1).getDay();
  const leading = first === 0 ? 6 : first - 1;

  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 font-sans text-[18px] font-extrabold capitalize tracking-tightest text-ink">
        {MONTH_LABELS_LONG[m0]} {y}
      </p>
      <div className="grid grid-cols-7 gap-1.5 px-1">
        {DOW_LABELS.map((l) => (
          <span key={l} className="text-center text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            {l}
          </span>
        ))}
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`b${i}`} aria-hidden style={{ width: 36, height: 36 }} />
        ))}
        {Array.from({ length: total }).map((_, i) => {
          const day = i + 1;
          const iso = `${y}-${String(m0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return (
            <div key={iso} className="flex flex-col items-center gap-0.5">
              <MoodCell
                mood={logsByDate[iso]}
                size={36}
                isToday={iso === today}
                title={`${iso} · ${logsByDate[iso] ? getMoodTokens(logsByDate[iso]).label : 'sin registro'}`}
              />
              <span className="text-[9px] font-bold tabular-nums text-ink-muted">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearGrid({ anchor, logsByDate, today }: { anchor: Date; logsByDate: Record<string, Mood>; today: string }) {
  const y = anchor.getFullYear();
  // 31 rows × 12 cols. Cells outside actual day count are blank placeholders.
  const cell = 14;
  const gap = 3;

  return (
    <div>
      <p className="mb-2 px-1 font-sans text-[18px] font-extrabold tracking-tightest text-ink">
        {y}
      </p>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `18px repeat(12, ${cell}px)`,
          columnGap: gap,
          rowGap: gap,
        }}
      >
        {/* Top-left empty cell */}
        <span aria-hidden />
        {/* Month labels */}
        {MONTH_LABELS_SHORT.map((l, i) => (
          <span
            key={`mh${i}`}
            className="text-center text-[10px] font-bold uppercase tracking-wider text-ink-muted"
            style={{ width: cell }}
          >
            {l}
          </span>
        ))}

        {/* Rows: day 1..31 */}
        {Array.from({ length: 31 }).map((_, row) => {
          const day = row + 1;
          return (
            <Row
              key={day}
              day={day}
              year={y}
              logsByDate={logsByDate}
              today={today}
              cell={cell}
            />
          );
        })}
      </div>
    </div>
  );
}

function Row({
  day,
  year,
  logsByDate,
  today,
  cell,
}: {
  day: number;
  year: number;
  logsByDate: Record<string, Mood>;
  today: string;
  cell: number;
}) {
  return (
    <>
      <span
        className="text-right text-[9px] font-bold tabular-nums text-ink-muted"
        style={{ lineHeight: `${cell}px` }}
      >
        {day}
      </span>
      {Array.from({ length: 12 }).map((_, m0) => {
        const dim = daysInMonth(year, m0);
        if (day > dim) {
          return <div key={`b-${day}-${m0}`} aria-hidden style={{ width: cell, height: cell }} />;
        }
        const iso = `${year}-${String(m0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return (
          <MoodCell
            key={iso}
            mood={logsByDate[iso]}
            size={cell}
            isToday={iso === today}
            title={`${iso} · ${logsByDate[iso] ? getMoodTokens(logsByDate[iso]).label : 'sin registro'}`}
          />
        );
      })}
    </>
  );
}

export function MoodLegend() {
  return (
    <ul className="flex flex-col gap-2">
      {MOOD_ORDER.map((m) => {
        const t = getMoodTokens(m);
        return (
          <li key={m} className="flex items-center gap-2">
            <span
              aria-hidden
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: `linear-gradient(135deg, ${t.bodyTop} 0%, ${t.bodyMid} 60%, ${t.bodyBottom} 100%)`,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
                filter: 'url(#mkxa-crayon)',
              }}
            />
            <span className="text-[12px] font-medium text-ink">{t.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
