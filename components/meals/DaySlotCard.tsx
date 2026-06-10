'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  /** When true, tapping a slot with a recipe opens the picker (edit mode);
   *  the card wiggles to signal the mode. */
  editMode?: boolean;
  /** Fired after a ~500ms press-and-hold on a slot with a recipe. */
  onLongPress?: () => void;
  /** Index used to alternate wiggle direction. */
  wobbleIdx?: number;
}

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Desayuno', lunch: 'Comida', dinner: 'Cena', snack: 'Snack', dessert: 'Postres',
};

const LONG_PRESS_MS = 500;

export function DaySlotCard({
  day,
  slot,
  row,
  onPick,
  onClear,
  onTogglePrepared,
  onToggleEaten,
  editMode = false,
  onLongPress,
  wobbleIdx = 0,
}: DaySlotCardProps) {
  const router = useRouter();
  const recipe = row?.recipe ?? null;

  // Long-press handling — same pattern as PantryItemRow.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);

  function clearTimer() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }
  function handlePointerDown() {
    if (!onLongPress || !recipe) return;
    longFired.current = false;
    clearTimer();
    timer.current = setTimeout(() => {
      longFired.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }
  function handlePointerEnd() { clearTimer(); }

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
  const thumb = recipe.image_url ?? recipe.thumbnail_url ?? null;

  function handleMainClick() {
    if (longFired.current) { longFired.current = false; return; }
    if (editMode) {
      onPick(day, slot);
    } else {
      // Go to the cook view — has TikTok embed + ingredients + steps.
      // The /recipes/[id] route is the image-gallery / management page.
      router.push(`/meals/cook/${recipe!.id}`);
    }
  }

  return (
    <div
      className={clsx(
        'relative rounded-card bg-white p-3 shadow-card',
        editMode && (wobbleIdx % 2 === 0 ? 'animate-wobble-l' : 'animate-wobble-r'),
      )}
      style={editMode ? { animationDelay: `${(wobbleIdx % 4) * 70}ms` } : undefined}
    >
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        {SLOT_LABELS[slot]}
      </p>
      <button
        type="button"
        onClick={handleMainClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerMove={handlePointerEnd}
        onContextMenu={(e) => {
          if (onLongPress) { e.preventDefault(); onLongPress(); }
        }}
        onSelectCapture={(e) => e.preventDefault()}
        aria-label={editMode ? `Cambiar ${SLOT_LABELS[slot]}` : `Ver ${recipe.title}`}
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
        className="flex w-full items-start gap-3 text-left touch-manipulation"
      >
        {thumb
          // eslint-disable-next-line @next/next/no-img-element
          ? <img
              src={thumb}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
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
