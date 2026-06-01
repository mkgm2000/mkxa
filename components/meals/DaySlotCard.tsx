'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { Plus, Hourglass, X, Play, Flame, Utensils } from 'lucide-react';
import type { MealDay, MealPlanRow, MealSlot } from '@/lib/meals/recipes';

interface DaySlotCardProps {
  day: MealDay;
  slot: MealSlot;
  row?: MealPlanRow;
  onPick: (day: MealDay, slot: MealSlot) => void;
  onClear: (day: MealDay, slot: MealSlot) => void;
  onTogglePrepared?: (day: MealDay, slot: MealSlot, value: boolean) => void;
  onToggleEaten?: (day: MealDay, slot: MealSlot, value: boolean) => void;
}

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Desayuno', lunch: 'Comida', dinner: 'Cena', snack: 'Snack',
};

export function DaySlotCard({
  day,
  slot,
  row,
  onPick,
  onClear,
  onTogglePrepared,
  onToggleEaten,
}: DaySlotCardProps) {
  const recipe = row?.recipe ?? null;

  if (!recipe) {
    return (
      <button
        type="button"
        onClick={() => onPick(day, slot)}
        className="flex w-full items-center justify-between rounded-card border border-dashed border-ink-soft bg-white/30 px-4 py-3"
      >
        <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink-muted">
          {SLOT_LABELS[slot]}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 text-ink">
          <Plus size={14} strokeWidth={1.5} aria-hidden />
        </span>
      </button>
    );
  }

  const prepared = row?.prepared === true;
  const eaten = row?.eaten === true;

  return (
    <div className="relative rounded-card bg-white p-3 shadow-card">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        {SLOT_LABELS[slot]}
      </p>
      <button
        type="button"
        onClick={() => onPick(day, slot)}
        aria-label={`Cambiar ${SLOT_LABELS[slot]}`}
        className="flex w-full items-start gap-3 text-left"
      >
        {recipe.image_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={recipe.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
          : <span className="h-12 w-12 rounded-lg bg-mood-happy-from" aria-hidden />}
        <span className="flex-1 min-w-0">
          <span className="block truncate text-[14px] font-bold text-ink">{recipe.title}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
            {recipe.prep_minutes && (<><Hourglass size={11} strokeWidth={1.5} aria-hidden /> {recipe.prep_minutes} min</>)}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onClear(day, slot)}
        aria-label="Quitar receta"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5"
      >
        <X size={12} strokeWidth={1.5} aria-hidden />
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
        {onTogglePrepared && (
          <button
            type="button"
            onClick={() => onTogglePrepared(day, slot, !prepared)}
            aria-pressed={prepared}
            aria-label={prepared ? 'Marcar no cocinada' : 'Marcar cocinada'}
            className={clsx(
              'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition-colors',
              prepared
                ? 'bg-ink text-white'
                : 'bg-ink/5 text-ink',
            )}
          >
            <Flame size={12} strokeWidth={1.5} aria-hidden />
            Cocinada
          </button>
        )}
        {onToggleEaten && prepared && (
          <button
            type="button"
            onClick={() => onToggleEaten(day, slot, !eaten)}
            aria-pressed={eaten}
            aria-label={eaten ? 'Marcar no comida' : 'Marcar comida'}
            className={clsx(
              'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition-colors',
              eaten
                ? 'bg-ink text-white'
                : 'bg-ink/5 text-ink',
            )}
          >
            <Utensils size={12} strokeWidth={1.5} aria-hidden />
            Comida
          </button>
        )}
        {onToggleEaten && !prepared && (
          <button
            type="button"
            onClick={() => onToggleEaten(day, slot, true)}
            aria-label="Marcar comida (también cocina)"
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-ink/5 px-3 text-[11px] font-bold text-ink"
          >
            <Utensils size={12} strokeWidth={1.5} aria-hidden />
            Comida
          </button>
        )}
        <Link
          href={`/meals/cook/${recipe.id}`}
          aria-label={`Cocinar ${recipe.title}`}
          className="inline-flex items-center gap-1.5 rounded-action bg-ink/10 px-3 py-1 text-[12px] font-bold text-ink"
        >
          <Play size={12} strokeWidth={1.5} aria-hidden />
          Cocinar
        </Link>
      </div>
    </div>
  );
}
