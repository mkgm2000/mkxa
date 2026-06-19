'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import clsx from 'clsx';

export interface WeekHeaderProps {
  week: number;
  maxWeek: number;
  done: number;
  total: number;
  meta: string;
  /** The calendar-current training week. Drives the "ACTUAL" badge +
   *  jump-to-current button when the user is viewing a different week. */
  currentWeek?: number;
  /** Days left in the current calendar week (excluding today). */
  daysRemaining?: number;
  onJumpToCurrent?: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function WeekHeader({
  week, maxWeek, done, total, meta,
  currentWeek, daysRemaining, onJumpToCurrent,
  onPrev, onNext,
}: WeekHeaderProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const atMax = week >= maxWeek;
  const atMin = week <= 1;
  const isCurrent = currentWeek != null && week === currentWeek;
  const showJump = currentWeek != null && !isCurrent && onJumpToCurrent;

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
          <div className="flex items-center gap-1.5">
            <h2 className="font-sans text-[32px] font-extrabold leading-none tracking-tightest text-ink">
              SEMANA {week}
            </h2>
            {isCurrent && (
              <span className="inline-flex items-center rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
                Actual
              </span>
            )}
          </div>
          {meta && (
            <p className="mt-1.5 text-[12px] text-ink-muted">
              {meta} <span aria-hidden>·</span> {done}/{total} sesiones
            </p>
          )}
          {isCurrent && typeof daysRemaining === 'number' && (
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">
              {daysRemaining === 0
                ? 'Último día · mañana empieza la próxima'
                : daysRemaining === 1
                ? 'Queda 1 día · mañana cierra la semana'
                : `Quedan ${daysRemaining} días para la semana ${week + 1}`}
            </p>
          )}
          {showJump && currentWeek != null && (
            <button
              type="button"
              onClick={onJumpToCurrent}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-ink-soft bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink active:scale-95"
            >
              <Calendar size={11} strokeWidth={1.75} aria-hidden />
              Ir a S{currentWeek} actual
            </button>
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
