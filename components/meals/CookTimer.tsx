'use client';

import { Play, Pause, RotateCcw } from 'lucide-react';
import { useCookTimer, formatTimer } from '@/lib/cook-timer';

interface CookTimerProps {
  initialMinutes: number | null | undefined;
}

export function CookTimer({ initialMinutes }: CookTimerProps) {
  const { status, remaining, start, pause, reset } = useCookTimer(initialMinutes);

  if (!initialMinutes) return null;

  return (
    <div className="rounded-mood bg-white p-6 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Temporizador</p>
      <p className="mt-2 font-sans text-[64px] font-extrabold leading-none tabular-nums text-ink">
        {formatTimer(remaining)}
      </p>
      <div className="mt-5 flex gap-3">
        {status === 'running' ? (
          <button
            type="button"
            onClick={pause}
            className="flex flex-1 items-center justify-center gap-2 rounded-action border border-ink py-3 text-[14px] font-bold text-ink"
            aria-label="Pausar"
          >
            <Pause size={18} strokeWidth={1.5} aria-hidden /> Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="flex flex-1 items-center justify-center gap-2 rounded-action bg-ink py-3 text-[14px] font-bold text-white"
            aria-label="Iniciar"
          >
            <Play size={18} strokeWidth={1.5} aria-hidden /> {status === 'paused' ? 'Reanudar' : 'Iniciar'}
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          className="flex h-12 w-12 items-center justify-center rounded-action border border-ink-soft text-ink-muted"
          aria-label="Reiniciar"
        >
          <RotateCcw size={18} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      {status === 'finished' && (
        <p className="mt-3 text-center text-[13px] font-bold text-ink">¡Tiempo!</p>
      )}
    </div>
  );
}
