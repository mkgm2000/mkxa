'use client';

import clsx from 'clsx';
import { PAID_BY_OPTIONS, type PaidBy } from '@/lib/expenses';

export interface PaidBySelectProps {
  value: PaidBy;
  onChange: (v: PaidBy) => void;
  className?: string;
}

export function PaidBySelect({ value, onChange, className }: PaidBySelectProps) {
  const activeIndex = PAID_BY_OPTIONS.findIndex((o) => o === value);

  return (
    <div
      role="radiogroup"
      aria-label="Pagado por"
      className={clsx(
        'relative grid grid-cols-3 rounded-full bg-white p-1.5 shadow-action',
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/3)] rounded-full bg-ink transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {PAID_BY_OPTIONS.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o)}
            className={clsx(
              'relative z-10 py-2 text-sm transition-colors',
              active ? 'text-white font-bold' : 'text-ink-muted font-medium',
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
