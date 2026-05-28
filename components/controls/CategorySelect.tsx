'use client';

import clsx from 'clsx';
import { CategoryDot } from './CategoryDot';
import {
  CATEGORIES,
  categoryLabel,
  type Category,
} from '@/lib/expenses';

export interface CategorySelectProps {
  value: Category;
  onChange: (c: Category) => void;
  id?: string;
  className?: string;
}

export function CategorySelect({ value, onChange, id, className }: CategorySelectProps) {
  return (
    <div className={clsx('relative w-full', className)}>
      <div
        aria-hidden
        className="pointer-events-none flex h-12 w-full items-center gap-2 rounded-item bg-white px-4 shadow-item"
      >
        <CategoryDot category={value} />
        <span className="font-sans text-sm font-medium text-ink">
          {categoryLabel(value)}
        </span>
      </div>
      <select
        id={id}
        aria-label="Categoría"
        value={value}
        onChange={(e) => onChange(e.target.value as Category)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-item bg-transparent text-transparent opacity-0"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{categoryLabel(c)}</option>
        ))}
      </select>
    </div>
  );
}
