import clsx from 'clsx';
import { categoryColorClass, type Category } from '@/lib/expenses';

export interface CategoryColorBarProps {
  category: Category;
  className?: string;
}

/**
 * 4px-wide vertical color bar. Place inside a `relative` parent. The bar fills
 * the parent's full height on the left edge, signalling the expense category.
 */
export function CategoryColorBar({ category, className }: CategoryColorBarProps) {
  return (
    <span
      aria-hidden
      className={clsx(
        'absolute left-0 top-0 bottom-0 w-1 rounded-l-item',
        categoryColorClass(category),
        className,
      )}
    />
  );
}
