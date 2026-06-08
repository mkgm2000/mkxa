'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { DOW_LABELS_LONG, getDateForDow } from '@/lib/plan-hyrox';
import type { DayKey } from '@/lib/plan-hyrox';

interface DayAssignmentSheetProps {
  open: boolean;
  week: number;
  dayKey: DayKey;
  title: string;
  currentDow: number;
  /** Map of dow → DayKey already taken by another session this week, so
   *  we can hint who's there and let the user confirm the swap. */
  taken: Record<number, DayKey>;
  onPick: (dow: number) => void;
  onClose: () => void;
}

const DOWS = [0, 1, 2, 3, 4, 5, 6];

export function DayAssignmentSheet({
  open, week, dayKey, title, currentDow, taken, onPick, onClose,
}: DayAssignmentSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/35"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full rounded-t-sheet bg-white p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Mover {dayKey}
            </p>
            <h2 className="mt-1 truncate font-sans text-[22px] font-extrabold leading-tight tracking-tightest text-ink">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-ink-soft text-ink-muted"
          >
            <X size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <p className="mb-3 text-[12px] text-ink-muted">
          Elige el día de la semana. Puedes apilar dos sesiones el mismo día si entrenáis doble.
        </p>

        <ul className="flex flex-col gap-1.5">
          {DOWS.map((dow) => {
            const date = getDateForDow(week, dow);
            const isCurrent = dow === currentDow;
            const occupiedBy = taken[dow];
            const swap = occupiedBy && !isCurrent ? occupiedBy : null;
            return (
              <li key={dow}>
                <button
                  type="button"
                  onClick={() => onPick(dow)}
                  className={`flex w-full items-center justify-between gap-3 rounded-action border px-4 py-3 text-left transition-colors ${
                    isCurrent
                      ? 'border-ink bg-ink text-white'
                      : 'border-ink-soft bg-white text-ink active:bg-ink-soft/50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-sans text-[16px] font-extrabold leading-tight tracking-tightest">
                      {DOW_LABELS_LONG[dow]}
                    </span>
                    <span className={`text-[11px] font-bold ${isCurrent ? 'text-white/70' : 'text-ink-muted'}`}>
                      {date.getUTCDate()} {date.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' })}
                    </span>
                  </div>
                  {isCurrent ? (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]">
                      Aquí ahora
                    </span>
                  ) : swap ? (
                    <span className="rounded-full bg-ink-soft/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                      Ya está {swap} · apila
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
