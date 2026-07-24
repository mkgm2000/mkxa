'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useExercise } from '@/lib/training/use-exercise';
import { gifUrl, thumbUrl, EXERCISE_ATTRIBUTION } from '@/lib/training/exercise-media';

// English facet → Spanish label, so the viewer reads native even though the
// dataset stores facets in English.
const BODY_PART: Record<string, string> = {
  back: 'Espalda', cardio: 'Cardio', chest: 'Pecho', 'lower arms': 'Antebrazo',
  'lower legs': 'Gemelo', neck: 'Cuello', shoulders: 'Hombro',
  'upper arms': 'Brazo', 'upper legs': 'Pierna', waist: 'Core',
};
const EQUIPMENT: Record<string, string> = {
  'body weight': 'Peso corporal', barbell: 'Barra', dumbbell: 'Mancuerna',
  kettlebell: 'Kettlebell', cable: 'Polea', band: 'Banda', 'resistance band': 'Banda',
  'leverage machine': 'Máquina', 'smith machine': 'Multipower',
  'medicine ball': 'Balón medicinal', 'skierg machine': 'Ski Erg',
  'sled machine': 'Trineo', 'ez barbell': 'Barra Z', weighted: 'Con peso',
  assisted: 'Asistido', 'stability ball': 'Fitball', 'olympic barbell': 'Barra olímpica',
  'trap bar': 'Barra hexagonal', rope: 'Cuerda', roller: 'Rodillo',
  'upper body ergometer': 'Ergómetro', hammer: 'Hammer', bosu: 'Bosu',
};

const label = (map: Record<string, string>, v: string) =>
  map[v] ?? (v ? v.charAt(0).toUpperCase() + v.slice(1) : '');

export interface ExerciseSheetProps {
  exerciseId: string;
  /** Spanish plan name — shown as the title so it matches the session. */
  blockName: string;
  onClose: () => void;
}

export function ExerciseSheet({ exerciseId, blockName, onClose }: ExerciseSheetProps) {
  const ex = useExercise(exerciseId);
  // Media fallback chain: gif → static thumb → neutral placeholder.
  const [mediaStage, setMediaStage] = useState<'gif' | 'thumb' | 'none'>('gif');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus into the sheet and restore it to the trigger on close.
    const prevFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocused?.focus?.();
    };
  }, [onClose]);

  const cap = (v: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : '');
  const chips = ex
    ? [label(BODY_PART, ex.body_part), label(EQUIPMENT, ex.equipment),
       ex.target ? `Objetivo: ${cap(ex.target)}` : ''].filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-ink/45 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={blockName}
    >
      <div
        className="flex max-h-[93vh] flex-col overflow-hidden rounded-t-sheet bg-white shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grip + close */}
        <div className="relative flex items-center justify-center pt-3 pb-1">
          <span aria-hidden className="h-1 w-10 rounded-full bg-ink-soft" />
          <button
            ref={closeRef}
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute right-4 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-ink-soft/60 text-ink transition-transform duration-150 active:scale-90"
          >
            <X size={17} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)' }}>
          {/* Animation */}
          <div className="mx-auto flex aspect-square w-full max-w-[300px] items-center justify-center overflow-hidden rounded-card bg-[#f3ecdd]">
            {mediaStage === 'none' ? (
              <span className="px-6 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                Sin animación
              </span>
            ) : (
              // Source media is small (180² native, 360² for upscaled ones).
              // Cap the display so the browser never stretches it past native —
              // a crisp smaller image beats a blurry enlarged one.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaStage === 'gif' ? gifUrl(exerciseId) : thumbUrl(exerciseId)}
                alt={blockName}
                loading="eager"
                onError={() => setMediaStage((s) => (s === 'gif' ? 'thumb' : 'none'))}
                className="max-h-[280px] max-w-[280px] object-contain"
              />
            )}
          </div>

          {/* Title + facets */}
          <h2 className="mt-5 font-sans text-[24px] font-extrabold leading-tight tracking-tightest text-ink">
            {blockName}
          </h2>
          {ex && ex.name.toLowerCase() !== blockName.toLowerCase() && (
            <p className="mt-0.5 text-[13px] text-ink-muted">{ex.name}</p>
          )}
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <span key={c} className="inline-flex items-center rounded-full border border-ink-soft px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Steps */}
          {ex && ex.steps.length > 0 && (
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Cómo se hace
              </p>
              <ol className="mt-3 flex flex-col gap-3">
                {ex.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-[14px] leading-[1.5] text-ink">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!ex && (
            <p className="mt-6 text-[13px] text-ink-muted">Cargando descripción…</p>
          )}

          <p className="mt-8 text-[10px] uppercase tracking-[0.06em] text-ink-muted/70">
            {EXERCISE_ATTRIBUTION}
          </p>
        </div>
      </div>
    </div>
  );
}
