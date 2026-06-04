'use client';

import { useMemo, useState } from 'react';
import { Plus, ScanLine } from 'lucide-react';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { SegmentedDayWeekMonth, type Range } from '@/components/controls/SegmentedDayWeekMonth';
import { AddExpenseSheet } from '@/components/expenses/AddExpenseSheet';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { ExpensesDashboard } from '@/components/expenses/ExpensesDashboard';
import { TicketScanSheet } from '@/components/expenses/TicketScanSheet';
import { useExpenses } from '@/lib/hooks/use-expenses';
import { formatEuros } from '@/lib/expenses';
import { todayISO, startOfWeekISO } from '@/lib/date';

function rangeBounds(range: Range, now = new Date()): { from: string; to: string; label: string } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (range === 'day') {
    const iso = todayISO(now);
    return { from: iso, to: iso, label: 'Hoy' };
  }
  if (range === 'week') {
    const from = startOfWeekISO(now);
    const start = new Date(from + 'T00:00:00Z');
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6));
    return { from, to: toISO(end), label: 'Esta semana' };
  }
  const monthStart = new Date(Date.UTC(y, m, 1));
  const monthEnd   = new Date(Date.UTC(y, m + 1, 0));
  return { from: toISO(monthStart), to: toISO(monthEnd), label: 'Este mes' };
  function toISO(dd: Date) {
    return `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, '0')}-${String(dd.getUTCDate()).padStart(2, '0')}`;
  }
}

export default function ExpensesPage() {
  const [range, setRange] = useState<Range>('month');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const { from, to, label } = useMemo(() => rangeBounds(range), [range]);
  const { data, loading, total } = useExpenses({ from, to });

  return (
    <main className="flex flex-col gap-5 px-5 pt-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-sans text-[40px] font-extrabold leading-none tracking-tightest text-ink">
            Gastos
          </h1>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-ink-muted">
            {label}
          </p>
          <p className="mt-1 font-sans text-[40px] font-extrabold leading-none tracking-tightest tabular-nums text-ink">
            {formatEuros(total)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <HeaderActionButton
            icon={Plus}
            label="Añadir gasto"
            onClick={() => setSheetOpen(true)}
          />
          <HeaderActionButton
            icon={ScanLine}
            label="Escanear ticket"
            onClick={() => setScanOpen(true)}
          />
        </div>
      </header>

      <InlineSaveText />

      <ExpensesDashboard />

      <SegmentedDayWeekMonth value={range} onChange={setRange} />

      <section aria-label="Lista de gastos" className="mt-2">
        {loading ? (
          <div className="rounded-card bg-white/70 p-6 text-center text-sm text-ink-muted shadow-item">
            Cargando…
          </div>
        ) : (
          <ExpenseList expenses={data} onAddExpense={() => setSheetOpen(true)} />
        )}
      </section>

      <AddExpenseSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <TicketScanSheet open={scanOpen} onClose={() => setScanOpen(false)} />
    </main>
  );
}
