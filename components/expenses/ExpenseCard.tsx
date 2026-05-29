import Link from 'next/link';
import { CategoryColorBar } from '@/components/controls/CategoryColorBar';
import { categoryLabel, formatEuros, type Expense } from '@/lib/expenses';

export interface ExpenseCardProps {
  expense: Expense;
}

function formatRelativeDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays > 1 && diffDays < 7) return `Hace ${diffDays} d`;
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(target);
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const merchant = expense.merchant || expense.description || 'Gasto';
  return (
    <Link
      href={`/expenses/${expense.id}`}
      aria-label={`${merchant}, ${formatEuros(Number(expense.amount))}`}
      className="relative block overflow-hidden rounded-item bg-white p-4 pl-5 shadow-item transition-transform duration-150 active:scale-[0.99]"
    >
      <CategoryColorBar category={expense.category} />
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate font-sans text-base font-bold text-ink">{merchant}</p>
        <p className="shrink-0 font-sans text-base font-bold tabular-nums text-ink">
          {formatEuros(Number(expense.amount))}
        </p>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        {categoryLabel(expense.category)} · {expense.paid_by} · {formatRelativeDate(expense.date)}
      </p>
    </Link>
  );
}
