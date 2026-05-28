'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CategorySelect } from '@/components/controls/CategorySelect';
import { PaidBySelect } from '@/components/controls/PaidBySelect';
import { useCreateExpense } from '@/lib/hooks/use-create-expense';
import { useAthlete } from '@/lib/athlete-context';
import { todayISO } from '@/lib/date';
import type {
  Category,
  PaidBy,
  NewExpense,
  ReceiptData,
} from '@/lib/expenses';

export interface ExpenseFormInitial {
  amount?: string;
  date?: string;
  merchant?: string;
  category?: Category;
  paid_by?: PaidBy;
  description?: string;
  receipt_url?: string | null;
  receipt_data?: ReceiptData | null;
}

export interface ExpenseFormProps {
  initial?: ExpenseFormInitial;
  redirectTo?: string;
  submitLabel?: string;
  onSaved?: (id: string) => void;
}

export function ExpenseForm({
  initial,
  redirectTo = '/expenses',
  submitLabel = 'Guardar',
  onSaved,
}: ExpenseFormProps) {
  const router = useRouter();
  const athlete = useAthlete();
  const { create, saving } = useCreateExpense();

  const [amount, setAmount]     = useState(initial?.amount ?? '');
  const [date, setDate]         = useState(initial?.date ?? todayISO());
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'comida');
  const [paidBy, setPaidBy]     = useState<PaidBy>(initial?.paid_by ?? 'Compartido');
  const [description, setDescription] = useState(initial?.description ?? '');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!athlete) return;
    const parsed = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const payload: NewExpense = {
      amount: parsed,
      currency: 'EUR',
      category,
      date,
      paid_by: paidBy,
      description: description.trim() || null,
      merchant: merchant.trim() || null,
      receipt_url: initial?.receipt_url ?? null,
      receipt_data: initial?.receipt_data ?? null,
      created_by: athlete,
    };
    const saved = await create(payload);
    if (!saved) return;
    if (onSaved) onSaved(saved.id);
    else router.push(redirectTo);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="rounded-card bg-white p-4 shadow-card">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Importe
        </span>
        <div className="mt-1 flex items-baseline gap-2">
          <input
            aria-label="Importe"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="w-full bg-transparent font-sans text-[32px] font-extrabold leading-none tracking-tightest text-ink placeholder:text-ink-soft focus:outline-none"
          />
          <span className="text-lg font-bold text-ink-muted">EUR</span>
        </div>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Fecha
          </span>
          <input
            aria-label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent font-sans text-sm font-medium text-ink focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Comercio
          </span>
          <input
            aria-label="Comercio"
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Mercadona…"
            className="bg-transparent font-sans text-sm font-medium text-ink placeholder:text-ink-muted focus:outline-none"
          />
        </label>
      </div>

      <div>
        <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Categoría
        </p>
        <CategorySelect value={category} onChange={setCategory} />
      </div>

      <div>
        <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Pagado por
        </p>
        <PaidBySelect value={paidBy} onChange={setPaidBy} />
      </div>

      <label className="flex flex-col gap-1.5 rounded-item bg-white p-3 shadow-item">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Nota
        </span>
        <textarea
          aria-label="Nota"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="min-h-[44px] resize-none bg-transparent font-sans text-sm font-medium text-ink placeholder:text-ink-muted focus:outline-none"
          placeholder="Opcional"
        />
      </label>

      <button
        type="submit"
        disabled={saving || !athlete}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 font-sans text-sm font-bold text-white shadow-action transition-transform duration-150 active:scale-95 disabled:opacity-50"
      >
        {saving ? 'Guardando…' : submitLabel}
      </button>
    </form>
  );
}
