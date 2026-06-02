'use client';

import { Circle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import type { PantryItem } from '@/lib/meals/recipes';

interface PantryItemRowProps {
  item: PantryItem;
  onToggle: (id: string) => void;
}

export function PantryItemRow({ item, onToggle }: PantryItemRowProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      aria-pressed={item.in_stock}
      className="flex w-full items-center gap-3 rounded-item bg-white px-3 py-2.5 text-left shadow-item transition-transform duration-150 active:scale-[0.99]"
    >
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-ink">
        {item.in_stock
          ? <CheckCircle2 size={22} strokeWidth={1.5} aria-hidden />
          : <Circle size={22} strokeWidth={1.5} className="text-ink-muted" aria-hidden />}
      </span>
      <span className={clsx('flex-1 text-[14px] font-medium', item.in_stock ? 'text-ink' : 'text-ink-muted')}>
        {item.name}
        {typeof item.units === 'number' && item.units > 0 && (
          <span className="ml-2 text-[12px] font-normal text-ink-muted">{item.units} uds</span>
        )}
      </span>
    </button>
  );
}
