'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { CategorySelect } from '@/components/controls/CategorySelect';
import { PaidBySelect } from '@/components/controls/PaidBySelect';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import { formatEuros, type Category, type Expense, type PaidBy } from '@/lib/expenses';

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabaseClient()
        .from('expenses')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setMissing(true);
        setLoading(false);
        return;
      }
      setExpense(data as Expense);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function patch(fields: Partial<Expense>) {
    if (!expense) return;
    const next = { ...expense, ...fields };
    setExpense(next);
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('expenses')
      .update(fields)
      .eq('id', expense.id);
    if (error) saveState.getState().set('error');
    else saveState.getState().set('saved');
  }

  async function onDelete() {
    if (!expense) return;
    if (!confirm('¿Eliminar este gasto?')) return;
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('expenses')
      .delete()
      .eq('id', expense.id);
    if (error) {
      saveState.getState().set('error');
      return;
    }
    saveState.getState().set('saved');
    router.push('/expenses');
  }

  if (loading) {
    return (
      <main className="px-5 pt-4 text-sm text-ink-muted">Cargando…</main>
    );
  }
  if (missing || !expense) {
    return (
      <main className="flex flex-col gap-4 px-5 pt-4">
        <Link
          href="/expenses"
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <p className="rounded-card bg-white/70 p-6 text-center text-sm text-ink-muted shadow-item">
          Gasto no encontrado.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-5 px-5 pt-4">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/expenses"
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150 active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <button
          type="button"
          aria-label="Eliminar"
          onClick={onDelete}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150 active:scale-95"
        >
          <Trash2 size={20} strokeWidth={1.5} className="text-danger" aria-hidden />
        </button>
      </header>

      <InlineSaveText />

      <section className="rounded-card bg-white p-5 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Importe</p>
        <input
          aria-label="Importe"
          type="text"
          inputMode="decimal"
          value={String(expense.amount)}
          onChange={(e) => {
            const v = Number(e.target.value.replace(',', '.'));
            if (Number.isFinite(v) && v > 0) void patch({ amount: v });
            else setExpense({ ...expense, amount: Number(e.target.value) || 0 });
          }}
          className="mt-1 w-full bg-transparent font-sans text-[40px] font-extrabold leading-none tracking-tightest tabular-nums text-ink focus:outline-none"
        />
        <p className="mt-1 text-xs text-ink-muted">{formatEuros(Number(expense.amount))}</p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Fecha</span>
          <input
            aria-label="Fecha"
            type="date"
            value={expense.date}
            onChange={(e) => void patch({ date: e.target.value })}
            className="bg-transparent font-sans text-sm font-medium text-ink focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Comercio</span>
          <input
            aria-label="Comercio"
            type="text"
            value={expense.merchant ?? ''}
            onChange={(e) => void patch({ merchant: e.target.value || null })}
            className="bg-transparent font-sans text-sm font-medium text-ink focus:outline-none"
          />
        </label>
      </div>

      <div>
        <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Categoría</p>
        <CategorySelect
          value={expense.category}
          onChange={(c: Category) => void patch({ category: c })}
        />
      </div>

      <div>
        <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Pagado por</p>
        <PaidBySelect
          value={expense.paid_by}
          onChange={(p: PaidBy) => void patch({ paid_by: p })}
        />
      </div>

      <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Nota</span>
        <textarea
          aria-label="Nota"
          value={expense.description ?? ''}
          onChange={(e) => void patch({ description: e.target.value || null })}
          rows={2}
          className="min-h-[44px] resize-none bg-transparent font-sans text-sm font-medium text-ink focus:outline-none"
        />
      </label>

      {expense.receipt_url && (
        <div className="overflow-hidden rounded-card bg-white shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={expense.receipt_url} alt="Factura" className="max-h-96 w-full object-contain" />
        </div>
      )}
    </main>
  );
}
