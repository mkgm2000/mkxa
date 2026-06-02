'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAthlete } from '@/lib/athlete-context';
import { useMoodRange } from '@/lib/hooks/use-mood-range';
import { YearInPixels, MoodLegend, type RangeKind } from '@/components/mood/YearInPixels';
import { getMoodTokens } from '@/lib/moods';

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TABS: { value: RangeKind; label: string }[] = [
  { value: 'week',  label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year',  label: 'Año' },
];

const MONTHS_LONG = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function MoodPage() {
  const router = useRouter();
  const athlete = useAthlete();
  const [range, setRange] = useState<RangeKind>('month');
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  // Always fetch the full anchor year — cheap, lets the user pan back
  // through months without an extra round-trip.
  const sinceISO = `${anchor.getFullYear()}-01-01`;
  const { logsByDate, loading } = useMoodRange(athlete, sinceISO);

  const loggedThisYear = useMemo(
    () => Object.keys(logsByDate).filter((d) => d.startsWith(String(anchor.getFullYear()))).length,
    [logsByDate, anchor],
  );

  // Most-frequent mood across logged days. Drives the small "racha" line
  // under the title so the screen isn't just a chart with no story.
  const topMood = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of Object.values(logsByDate)) counts.set(m, (counts.get(m) ?? 0) + 1);
    let best: { mood: string; n: number } | null = null;
    counts.forEach((n, mood) => {
      if (best === null || n > best.n) best = { mood, n };
    });
    return best as { mood: string; n: number } | null;
  }, [logsByDate]);

  function shift(direction: -1 | 1) {
    const next = new Date(anchor);
    if (range === 'week') next.setDate(next.getDate() + 7 * direction);
    else if (range === 'month') next.setMonth(next.getMonth() + direction);
    else next.setFullYear(next.getFullYear() + direction);
    setAnchor(next);
  }

  function anchorLabel() {
    if (range === 'year') return String(anchor.getFullYear());
    if (range === 'month') return `${MONTHS_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`;
    // week: range as ISO span
    const start = new Date(anchor);
    const dow = start.getDay();
    const back = dow === 0 ? 6 : dow - 1;
    start.setDate(start.getDate() - back);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return `${fmt(start)} – ${fmt(end)}`;
  }

  return (
    <main className="flex flex-col gap-5 pb-12 pt-2">
      <header className="flex items-start justify-between gap-4 px-5 pt-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Tu año
          </p>
          <h1 className="mt-1 font-sans text-[40px] font-extrabold leading-[1.02] tracking-tightest text-ink">
            Mood
          </h1>
          {topMood && (
            <p className="mt-2 text-[13px] text-ink-muted">
              Más frecuente:{' '}
              <span className="font-bold text-ink">
                {getMoodTokens(topMood.mood as Parameters<typeof getMoodTokens>[0]).label}
              </span>{' '}
              · {loggedThisYear} {loggedThisYear === 1 ? 'día' : 'días'}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Volver"
          onClick={() => {
            // Walk back through history so /home → /mood → back returns to
            // /home, and /profile → /mood → back returns to /profile.
            // Falls back to /home if there is no entry to pop (deep link).
            if (typeof window !== 'undefined' && window.history.length > 1) router.back();
            else router.push('/home');
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </button>
      </header>

      <div className="px-5">
        <div role="tablist" aria-label="Rango" className="relative grid grid-cols-3 rounded-full bg-white p-1.5 shadow-action">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/3)] rounded-full bg-ink transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${TABS.findIndex((t) => t.value === range) * 100}%)` }}
          />
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={range === t.value}
              onClick={() => setRange(t.value)}
              className={`relative z-10 py-2 text-[13px] font-bold ${range === t.value ? 'text-white' : 'text-ink-muted'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5">
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => shift(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
        >
          <ChevronLeft size={18} strokeWidth={1.5} className="text-ink" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setAnchor(new Date())}
          className="flex-1 rounded-full bg-white py-2.5 text-center font-sans text-[14px] font-extrabold capitalize text-ink shadow-action active:scale-[0.98]"
        >
          {anchorLabel()}
        </button>
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => shift(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
        >
          <ChevronRight size={18} strokeWidth={1.5} className="text-ink" aria-hidden />
        </button>
      </div>

      <section className="px-5">
        <div className="rounded-card bg-white p-5 shadow-card">
          {loading ? (
            <p className="py-10 text-center text-[13px] text-ink-muted">Cargando…</p>
          ) : (
            <YearInPixels logsByDate={logsByDate} range={range} anchorISO={toISO(anchor)} />
          )}
        </div>
      </section>

      <section className="px-5">
        <div className="rounded-card bg-white p-4 shadow-card">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Leyenda
          </p>
          <MoodLegend />
        </div>
      </section>
    </main>
  );
}
