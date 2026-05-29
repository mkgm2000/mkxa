'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { RC } from '@/lib/training-colors';

export interface RpeModalProps {
  open: boolean;
  dayKey: string;
  title: string;
  rpe: number | null;
  notes: string;
  onSelectRpe: (n: number) => void;
  onChangeNotes: (s: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function RpeModal(props: RpeModalProps) {
  const { dayKey, title, rpe, notes, onSelectRpe, onChangeNotes, onSave, onClose, open } = props;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div
      data-testid="rpe-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[2px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Registro ${dayKey}`}
        className="mx-2 mb-2 w-full max-w-md rounded-sheet bg-white p-6 shadow-card"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              {dayKey} · {title}
            </p>
            <h3 className="mt-1 font-sans text-[22px] font-extrabold leading-tight tracking-tightest text-ink">
              ¿Cómo fue?
            </h3>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 transition-transform duration-150 active:scale-95"
          >
            <X size={18} strokeWidth={1.5} className="text-ink" aria-hidden />
          </button>
        </div>

        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          RPE real
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {RPE_VALUES.map((n) => {
            const selected = rpe === n;
            const color = RC[n];
            return (
              <button
                key={n}
                type="button"
                aria-label={`RPE ${n}`}
                aria-pressed={selected}
                onClick={() => onSelectRpe(n)}
                className={clsx(
                  'flex h-12 w-12 items-center justify-center rounded-full text-[13px] font-extrabold transition-transform duration-150 active:scale-95',
                  selected ? 'text-white' : 'text-ink-muted'
                )}
                style={{
                  background: selected ? color : `${color}1f`,
                  boxShadow: selected ? `0 0 0 2px #1b1d1f` : 'none',
                }}
              >
                {n}
              </button>
            );
          })}
        </div>

        <label className="mt-5 block">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Notas
          </span>
          <textarea
            aria-label="Notas"
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="¿Cómo te sentiste?"
            rows={3}
            className="mt-2 w-full resize-none rounded-item border border-ink-soft bg-white px-3 py-2.5 text-[13px] text-ink focus:border-ink focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={onSave}
          className="mt-5 w-full rounded-action bg-ink py-3.5 text-[14px] font-bold text-white transition-transform duration-150 active:scale-[0.98]"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
