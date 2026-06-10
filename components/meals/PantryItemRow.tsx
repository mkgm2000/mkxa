'use client';

import { useRef } from 'react';
import type { PantryItem } from '@/lib/meals/recipes';

interface PantryItemRowProps {
  item: PantryItem;
  /** Long-press (≥500ms) handler used to open the edit/delete action sheet. */
  onLongPress?: (item: PantryItem) => void;
}

const LONG_PRESS_MS = 500;

export function PantryItemRow({ item, onLongPress }: PantryItemRowProps) {
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
    // Tap does nothing — items are removed via the long-press action sheet.
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
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      className="flex w-full items-center gap-3 rounded-item bg-white px-3 py-2.5 text-left shadow-item transition-transform duration-150 active:scale-[0.99] touch-manipulation"
    >
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
      <span className="flex-1 text-[14px] font-medium text-ink">
        {item.name}
        {typeof item.units === 'number' && item.units > 0 && (
          <span className="ml-2 text-[12px] font-normal text-ink-muted">{item.units} uds</span>
        )}
      </span>
    </button>
  );
}
