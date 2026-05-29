'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CookTimer } from './CookTimer';
import type { RecipeStep } from '@/lib/meals/recipes';

interface CookStepperProps {
  steps: RecipeStep[];
}

export function CookStepper({ steps }: CookStepperProps) {
  const [i, setI] = useState(0);
  if (steps.length === 0) {
    return <p className="px-5 py-10 text-center text-[13px] text-ink-muted">Esta receta no tiene pasos guardados.</p>;
  }
  const step = steps[i];
  const total = steps.length;

  return (
    <section className="flex flex-col gap-5 px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        Paso {i + 1} de {total}
      </p>
      <h2 className="font-sans text-[28px] font-extrabold leading-tight tracking-tightest text-ink">
        {step.body}
      </h2>

      {step.timer_min != null && step.timer_min > 0 && (
        <CookTimer initialMinutes={step.timer_min} />
      )}

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() => setI((x) => Math.max(0, x - 1))}
          disabled={i === 0}
          aria-label="Paso anterior"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-action border border-ink-soft text-[14px] font-medium text-ink disabled:opacity-30"
        >
          <ChevronLeft size={18} strokeWidth={1.5} aria-hidden /> Anterior
        </button>
        <button
          type="button"
          onClick={() => setI((x) => Math.min(total - 1, x + 1))}
          disabled={i === total - 1}
          aria-label="Paso siguiente"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-action bg-ink text-[14px] font-bold text-white disabled:opacity-30"
        >
          Siguiente <ChevronRight size={18} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </section>
  );
}
