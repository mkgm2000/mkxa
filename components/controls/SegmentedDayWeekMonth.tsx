'use client';

import clsx from 'clsx';

export type Range = 'day' | 'week' | 'month';

const OPTIONS: { value: Range; label: string }[] = [
  { value: 'day',   label: 'Día' },
  { value: 'week',  label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

export interface SegmentedDayWeekMonthProps {
  value: Range;
  onChange: (v: Range) => void;
  className?: string;
}

export function SegmentedDayWeekMonth({ value, onChange, className }: SegmentedDayWeekMonthProps) {
  const activeIndex = OPTIONS.findIndex((o) => o.value === value);

  return (
    <div
      role="radiogroup"
      aria-label="Rango"
      className={clsx(
        'relative grid grid-cols-3 rounded-full bg-white p-1.5 shadow-action',
        className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-1.5 top-1.5 bottom-1.5 w-[calc((100%-12px)/3)] rounded-full bg-ink transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'relative z-10 py-2 text-sm transition-colors',
              active ? 'text-white font-bold' : 'text-ink-muted font-medium'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
