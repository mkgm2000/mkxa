'use client';

import { useRef } from 'react';
import { Circle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import type { ShoppingItem } from '@/lib/meals/recipes';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  /** Long-press (≥500ms) handler used to open the edit/delete action sheet. */
  onLongPress?: (item: ShoppingItem) => void;
  recipeNamesById?: Record<string, string>;
  alreadyAtHome?: boolean;
}

const LONG_PRESS_MS = 500;

function formatQty(quantity: number | null, unit: string | null): string {
  if (quantity == null) return unit ?? '';
  const q = Number.isInteger(quantity) ? quantity : Number(quantity.toFixed(1));
  return `${q}${unit ? ` ${unit}` : ''}`;
}

export function ShoppingItemRow({ item, onToggle, onLongPress, recipeNamesById, alreadyAtHome = false }: ShoppingItemRowProps) {
  const qty = formatQty(item.quantity, item.unit);
  const recipes = (item.recipe_ids ?? [])
    .map((id) => recipeNamesById?.[id])
    .filter(Boolean) as string[];

  // Long-press handling: pointerDown starts a timer; pointerUp/pointerMove/cancel
  // aborts it. If the timer fires, we trip a flag so the next `click` no-ops
  // (otherwise the toggle would fire when the user releases).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);

  function clearTimer() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }
  function handlePointerDown() {
    if (!onLongPress) return;
    longFired.current = false;
    clearTimer();
    timer.current = setTimeout(() => {
      longFired.current = true;
      onLongPress(item);
    }, LONG_PRESS_MS);
  }
  function handlePointerEnd() { clearTimer(); }
  function handleClick() {
    if (longFired.current) { longFired.current = false; return; }
    onToggle(item.id);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onContextMenu={(e) => {
        // Desktop right-click should open the same sheet as long-press —
        // and stop the browser's default menu from intercepting.
        if (onLongPress) { e.preventDefault(); onLongPress(item); }
      }}
      aria-pressed={item.checked}
      className={clsx(
        'flex w-full items-center gap-3 rounded-item bg-white px-3 py-2.5 text-left shadow-item transition-transform duration-150 active:scale-[0.99] touch-manipulation select-none',
        alreadyAtHome && 'opacity-60',
      )}
    >
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-ink">
        {item.checked
          ? <CheckCircle2 size={22} strokeWidth={1.5} aria-hidden />
          : <Circle size={22} strokeWidth={1.5} className="text-ink-muted" aria-hidden />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 min-w-0">
          <span
            className={clsx(
              'block truncate text-[14px] font-bold',
              item.checked || alreadyAtHome ? 'text-ink-muted line-through' : 'text-ink',
            )}
          >
            {item.name}
          </span>
          {alreadyAtHome && (
            <span className="flex-shrink-0 rounded-full bg-ink-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-ink-muted">
              En despensa
            </span>
          )}
        </span>
        {recipes.length > 0 && (
          <span className="block truncate text-[11px] text-ink-muted">
            de: {recipes.join(', ')}
          </span>
        )}
      </span>
      {qty && (
        <span className={clsx('flex-shrink-0 text-[13px] font-bold tabular-nums', item.checked || alreadyAtHome ? 'text-ink-muted' : 'text-ink')}>
          {qty}
        </span>
      )}
    </button>
  );
}
