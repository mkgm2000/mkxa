import { ExpenseCard } from './ExpenseCard';
import type { Expense } from '@/lib/expenses';

export interface ExpenseListProps {
  expenses: Expense[];
  emptyText?: string;
}

export function ExpenseList({ expenses, emptyText = 'Sin gastos en este periodo.' }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-card bg-white/70 p-6 text-center text-sm text-ink-muted shadow-item">
        {emptyText}
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {expenses.map((e) => (
        <li key={e.id}><ExpenseCard expense={e} /></li>
      ))}
    </ul>
  );
}
