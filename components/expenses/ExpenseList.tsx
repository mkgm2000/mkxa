import { Wallet } from 'lucide-react';
import { ExpenseCard } from './ExpenseCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Expense } from '@/lib/expenses';

export interface ExpenseListProps {
  expenses: Expense[];
  /** Click handler for the "Añadir gasto" CTA on the empty state. */
  onAddExpense?: () => void;
  /** Fallback raw text — kept for backwards compatibility with callers that
   *  embed this list outside the standard expenses page (e.g. the receipt
   *  preview). When omitted, the rich EmptyState is rendered instead. */
  emptyText?: string;
}

export function ExpenseList({ expenses, onAddExpense, emptyText }: ExpenseListProps) {
  if (expenses.length === 0) {
    if (emptyText) {
      return (
        <div className="rounded-card bg-white/70 p-6 text-center text-sm text-ink-muted shadow-item">
          {emptyText}
        </div>
      );
    }
    return (
      <EmptyState
        icon={Wallet}
        title="Aún no hay gastos este mes"
        subtitle="Registra el primero o importa un ticket."
        ctas={
          onAddExpense
            ? [{ label: 'Añadir gasto', onClick: onAddExpense, variant: 'primary' }]
            : undefined
        }
      />
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
