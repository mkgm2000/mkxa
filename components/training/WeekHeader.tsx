'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export interface WeekHeaderProps {
  week: number;
  maxWeek: number;
  done: number;
  total: number;
  meta: string;
  onPrev: () => void;
  onNext: () => void;
}

export function WeekHeader({ week, maxWeek, done, total, meta, onPrev, onNext }: WeekHeaderProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const atMax = week >= maxWeek;
  const atMin = week <= 1;

  return (
    <section className="px-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Semana anterior"
          onClick={onPrev}
          disabled={atMin}
          className={clsx(
            'flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150',
            atMin ? 'opacity-30' : 'active:scale-95'
          )}
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </button>

        <div className="flex flex-1 flex-col items-center">
          <h2 className="font-sans text-[32px] font-extrabold leading-none tracking-tightest text-ink">
            SEMANA {week}
          </h2>
          {meta && (
            <p className="mt-1.5 text-[12px] text-ink-muted">
              {meta} <span aria-hidden>·</span> {done}/{total} sesiones
            </p>
          )}
        </div>

        {!atMax ? (
          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={onNext}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150 active:scale-95"
          >
            <ChevronRight size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
          </button>
        ) : (
          <span className="h-10 w-10" aria-hidden />
        )}
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink-soft">
        <div
          data-testid="week-progress-fill"
          className="h-full rounded-full bg-ink transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
