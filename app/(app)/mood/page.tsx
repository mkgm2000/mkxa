'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAthlete } from '@/lib/athlete-context';
import { useMoodRange } from '@/lib/hooks/use-mood-range';
import { CrayonFilter } from '@/components/mood/CrayonFilter';
import { YearInPixels, MoodLegend, type RangeKind } from '@/components/mood/YearInPixels';

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

export default function MoodPage() {
  const athlete = useAthlete();
  const [range, setRange] = useState<RangeKind>('month');
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const sinceISO = useMemo(() => {
    // Always fetch the full current year — cheap, and lets the user pan
    // back to any month without an extra round-trip.
    return `${anchor.getFullYear()}-01-01`;
  }, [anchor]);

  const { logsByDate, loading } = useMoodRange(athlete, sinceISO);

  const loggedCount = useMemo(() => Object.keys(logsByDate).length, [logsByDate]);

  function shift(direction: -1 | 1) {
    const next = new Date(anchor);
    if (range === 'week') next.setDate(next.getDate() + 7 * direction);
    else if (range === 'month') next.setMonth(next.getMonth() + direction);
    else next.setFullYear(next.getFullYear() + direction);
    setAnchor(next);
  }

  return (
    <main className="flex flex-col gap-4 pb-12 pt-2">
      <CrayonFilter />

      <header className="flex items-start justify-between gap-4 px-5 pt-6">
        <div>
          <h1 className="font-sans text-[36px] font-extrabold leading-[1.05] tracking-tightest text-ink">
            Mood
          </h1>
          <p className="mt-2 text-[13px] text-ink-muted">
            {athlete ? `Cómo se ha sentido ${athlete}` : 'Tu historial de mood'}
          </p>
        </div>
        <Link
          href="/profile"
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
      </header>

      {/* Range tabs */}
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

      {/* Anchor stepper */}
      <div className="flex items-center justify-between px-5">
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => shift(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
        >
          <ChevronLeft size={18} strokeWidth={1.5} className="text-ink" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setAnchor(new Date())}
          className="rounded-full bg-white px-4 py-1.5 text-[12px] font-bold text-ink shadow-action active:scale-95"
        >
          Hoy
        </button>
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => shift(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
        >
          <ChevronRight size={18} strokeWidth={1.5} className="text-ink" aria-hidden />
        </button>
      </div>

      {/* Grid + legend */}
      <section className="px-5">
        <div className="rounded-card bg-white p-4 shadow-card">
          {loading ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">Cargando…</p>
          ) : (
            <div className={range === 'year' ? 'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6' : 'flex flex-col gap-4'}>
              <div className={range === 'year' ? 'overflow-x-auto' : ''}>
                <YearInPixels logsByDate={logsByDate} range={range} anchorISO={toISO(anchor)} />
              </div>
              <div className="border-t border-ink-soft pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  Leyenda
                </p>
                <MoodLegend />
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 px-1 text-[12px] text-ink-muted">
          {loggedCount} {loggedCount === 1 ? 'día registrado' : 'días registrados'} este año
        </p>
      </section>
    </main>
  );
}
