'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Sliders, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { useAthlete } from '@/lib/athlete-context';
import { useMoodRange } from '@/lib/hooks/use-mood-range';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import { getMoodTokens, MOODS, MOOD_ORDER, type Mood } from '@/lib/moods';
import { MoodLegend } from '@/components/mood/YearInPixels';
import { MoodFace } from '@/components/mood/MoodFace';

type ViewKind = 'week' | 'month';

const MONTHS_LONG = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysInMonth(year: number, monthIdx: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

export default function MoodPage() {
  const router = useRouter();
  const athlete = useAthlete();
  const [view, setView] = useState<ViewKind>('month');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  // Fetch the anchor's full year — cheap, lets the user pan months
  // without re-fetching every step.
  const sinceISO = `${anchor.getFullYear()}-01-01`;
  const { logsByDate, loading } = useMoodRange(athlete, sinceISO);

  const todayISO = useMemo(() => toISO(new Date()), []);

  function shift(direction: -1 | 1) {
    const next = new Date(anchor);
    if (view === 'week') next.setDate(next.getDate() + 7 * direction);
    else next.setMonth(next.getMonth() + direction);
    setAnchor(next);
  }

  function headerLabel(): string {
    if (view === 'month') return `${MONTHS_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`;
    const start = new Date(anchor);
    const dow = start.getDay();
    const back = dow === 0 ? 6 : dow - 1;
    start.setDate(start.getDate() - back);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return `${fmt(start)} – ${fmt(end)}`;
  }

  // Days the grid renders. In Week view always 7 (Mon..Sun of the anchor's
  // week). In Month view, all days of the anchor's month numbered 1..N.
  const days: { iso: string; dayNumber: number }[] = useMemo(() => {
    if (view === 'week') {
      const start = new Date(anchor);
      const dow = start.getDay();
      const back = dow === 0 ? 6 : dow - 1;
      start.setDate(start.getDate() - back);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return { iso: toISO(d), dayNumber: d.getDate() };
      });
    }
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const n = daysInMonth(y, m);
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(y, m, i + 1);
      return { iso: toISO(d), dayNumber: i + 1 };
    });
  }, [view, anchor]);

  const save = useCallback(async (date: string, mood: Mood) => {
    if (!athlete) return;
    saveState.getState().set('saving');
    const { error } = await supabaseClient().from('mood_logs').upsert({
      athlete, date, mood, note: null,
    }, { onConflict: 'athlete,date' });
    if (error) { saveState.getState().set('error'); return; }
    saveState.getState().set('saved');
    // The hook refreshes via window focus; force re-fetch by bumping anchor
    // to the same date (which keeps the visible month identical).
    setAnchor(new Date(anchor));
  }, [athlete, anchor]);

  // Close legend on Escape.
  useEffect(() => {
    if (!legendOpen && !pickerDate) return;
    function k(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (pickerDate) setPickerDate(null);
      else if (legendOpen) setLegendOpen(false);
    }
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [legendOpen, pickerDate]);

  return (
    <main className="flex flex-col gap-6 pt-2">
      {/* Top row: back | tabs | legend */}
      <header className="flex items-center justify-between gap-3 px-5 pt-6">
        <button
          type="button"
          aria-label="Volver"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) router.back();
            else router.push('/home');
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </button>

        <div role="tablist" className="relative grid grid-cols-2 rounded-full bg-white p-1 shadow-action" style={{ minWidth: 168 }}>
          <span
            aria-hidden
            className="pointer-events-none absolute left-1 top-1 bottom-1 w-[calc((100%-8px)/2)] rounded-full bg-white shadow-card transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${view === 'week' ? 0 : 100}%)` }}
          />
          {(['week', 'month'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={clsx(
                'relative z-10 px-5 py-2 text-[13px] font-bold',
                view === v ? 'text-ink' : 'text-ink-muted',
              )}
            >
              {v === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-label="Leyenda"
          onClick={() => setLegendOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
        >
          <Sliders size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
        </button>
      </header>

      {/* Month nav: < title > */}
      <div className="flex items-center justify-between px-6">
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => shift(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink active:scale-95"
        >
          <ChevronLeft size={22} strokeWidth={1.75} aria-hidden />
        </button>
        <h1 className="font-sans text-[22px] font-extrabold capitalize tracking-tightest text-ink">
          {headerLabel()}
        </h1>
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => shift(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted active:scale-95"
        >
          <ChevronRight size={22} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {/* Day grid — 6 cols to match the reference layout */}
      <section className="px-5 pb-10">
        {loading ? (
          <p className="py-10 text-center text-[13px] text-ink-muted">Cargando…</p>
        ) : (
          <ul className="grid grid-cols-6 gap-y-5 gap-x-2 sm:gap-x-3">
            {days.map(({ iso, dayNumber }) => {
              const mood = logsByDate[iso] as Mood | undefined;
              const tokens = mood ? getMoodTokens(mood) : null;
              const isToday = iso === todayISO;
              return (
                <li key={iso} className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPickerDate(iso)}
                    aria-label={`Día ${dayNumber}${mood ? `, ${tokens?.label}` : ''}`}
                    className={clsx(
                      'relative rounded-full transition-transform duration-150 active:scale-95',
                      isToday && 'ring-2 ring-ink ring-offset-2 ring-offset-[var(--mood-bg,#ffffff)]',
                    )}
                  >
                    {mood ? (
                      <MoodFace mood={mood} size={48} />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-ink-soft bg-white text-ink-muted shadow-action">
                        <Plus size={18} strokeWidth={1.75} aria-hidden />
                      </span>
                    )}
                  </button>
                  <span className="text-[12px] font-bold tabular-nums text-ink">{dayNumber}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pickerDate && (
        <MoodPickerSheet
          dateISO={pickerDate}
          current={logsByDate[pickerDate] as Mood | undefined}
          onClose={() => setPickerDate(null)}
          onPick={async (m) => {
            await save(pickerDate, m);
            setPickerDate(null);
          }}
        />
      )}

      {legendOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Leyenda"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 px-4 pb-8 sm:items-center"
          onClick={() => setLegendOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-card bg-white p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-sans text-[17px] font-extrabold text-ink">Leyenda</h3>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setLegendOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
              >
                <X size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
              </button>
            </div>
            <MoodLegend />
          </div>
        </div>
      )}
    </main>
  );
}

// --- Mood picker -----------------------------------------------------------

function MoodPickerSheet({
  dateISO,
  current,
  onClose,
  onPick,
}: {
  dateISO: string;
  current: Mood | undefined;
  onClose: () => void;
  onPick: (m: Mood) => void | Promise<void>;
}) {
  const order = useMemo(
    () => (MOOD_ORDER.length ? MOOD_ORDER : MOODS),
    [],
  );
  const [y, m, d] = dateISO.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const pretty = date.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Elegir mood"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              Registrar mood
            </p>
            <h3 className="mt-0.5 font-sans text-[18px] font-extrabold capitalize text-ink">
              {pretty}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
          >
            <X size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
          </button>
        </div>

        <ul className="grid grid-cols-4 gap-3">
          {order.map((m) => {
            const t = getMoodTokens(m);
            const active = current === m;
            return (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => void onPick(m)}
                  aria-pressed={active}
                  className={clsx(
                    'flex w-full flex-col items-center gap-1.5 rounded-2xl py-3 transition-transform duration-150 active:scale-[0.97]',
                    active ? 'bg-ink-soft/40 ring-2 ring-ink' : 'bg-white/0',
                  )}
                >
                  <MoodFace mood={m} size={52} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink">
                    {t.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
