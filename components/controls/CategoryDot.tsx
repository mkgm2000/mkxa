import clsx from 'clsx';
import { categoryColorClass, type Category } from '@/lib/expenses';

export interface CategoryDotProps {
  category: Category;
  className?: string;
}

export function CategoryDot({ category, className }: CategoryDotProps) {
  return (
    <span
      aria-hidden
      className={clsx(
        'inline-block h-2 w-2 rounded-full',
        categoryColorClass(category),
        className,
      )}
    />
  );
}
