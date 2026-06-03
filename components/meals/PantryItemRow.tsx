'use client';

import { useRef } from 'react';
import { Circle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import type { PantryItem } from '@/lib/meals/recipes';

interface PantryItemRowProps {
  item: PantryItem;
  onToggle: (id: string) => void;
  /** Long-press (≥500ms) handler used to open the edit/delete action sheet. */
  onLongPress?: (item: PantryItem) => void;
}

const LONG_PRESS_MS = 500;

export function PantryItemRow({ item, onToggle, onLongPress }: PantryItemRowProps) {
  // Long-press handling — same pattern as ShoppingItemRow so the UX is
  // consistent between Compra and Despensa.
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
        if (onLongPress) { e.preventDefault(); onLongPress(item); }
      }}
      onSelectCapture={(e) => e.preventDefault()}
      aria-pressed={item.in_stock}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      className="flex w-full items-center gap-3 rounded-item bg-white px-3 py-2.5 text-left shadow-item transition-transform duration-150 active:scale-[0.99] touch-manipulation"
    >
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-ink">
        {item.in_stock
          ? <CheckCircle2 size={22} strokeWidth={1.5} aria-hidden />
          : <Circle size={22} strokeWidth={1.5} className="text-ink-muted" aria-hidden />}
      </span>
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt=""
          className="h-9 w-9 flex-shrink-0 rounded-action bg-white object-contain p-0.5"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}
      <span className={clsx('flex-1 text-[14px] font-medium', item.in_stock ? 'text-ink' : 'text-ink-muted')}>
        {item.name}
        {typeof item.units === 'number' && item.units > 0 && (
          <span className="ml-2 text-[12px] font-normal text-ink-muted">{item.units} uds</span>
        )}
      </span>
    </button>
  );
}
