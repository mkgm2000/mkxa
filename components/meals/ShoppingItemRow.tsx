'use client';

import { Circle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import type { ShoppingItem } from '@/lib/meals/recipes';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  recipeNamesById?: Record<string, string>;
}

function formatQty(quantity: number | null, unit: string | null): string {
  if (quantity == null) return unit ?? '';
  const q = Number.isInteger(quantity) ? quantity : Number(quantity.toFixed(1));
  return `${q}${unit ? ` ${unit}` : ''}`;
}

export function ShoppingItemRow({ item, onToggle, recipeNamesById }: ShoppingItemRowProps) {
  const qty = formatQty(item.quantity, item.unit);
  const recipes = (item.recipe_ids ?? [])
    .map((id) => recipeNamesById?.[id])
    .filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      aria-pressed={item.checked}
      className="flex w-full items-center gap-3 rounded-item bg-white px-3 py-2.5 text-left shadow-item transition-transform duration-150 active:scale-[0.99]"
    >
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-ink">
        {item.checked
          ? <CheckCircle2 size={22} strokeWidth={1.5} aria-hidden />
          : <Circle size={22} strokeWidth={1.5} className="text-ink-muted" aria-hidden />}
      </span>
      <span className="flex-1 min-w-0">
        <span
          className={clsx(
            'block truncate text-[14px] font-bold',
            item.checked ? 'text-ink-muted line-through' : 'text-ink',
          )}
        >
          {item.name}
        </span>
        {recipes.length > 0 && (
          <span className="block truncate text-[11px] text-ink-muted">
            de: {recipes.join(', ')}
          </span>
        )}
      </span>
      {qty && (
        <span className={clsx('flex-shrink-0 text-[13px] font-bold tabular-nums', item.checked ? 'text-ink-muted' : 'text-ink')}>
          {qty}
        </span>
      )}
    </button>
  );
}
