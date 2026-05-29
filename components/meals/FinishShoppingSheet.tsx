'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { PaidBySelect } from '@/components/controls/PaidBySelect';
import type { PaidBy } from '@/lib/expenses';

interface FinishShoppingSheetProps {
  open: boolean;
  onClose: () => void;
  onFinish: (input: { total: number; paid_by: PaidBy; merchant?: string | null }) => Promise<{ expense_id?: string; error?: string } | void>;
}

export function FinishShoppingSheet({ open, onClose, onFinish }: FinishShoppingSheetProps) {
  const [total, setTotal] = useState('');
  const [paidBy, setPaidBy] = useState<PaidBy>('Compartido');
  const [merchant, setMerchant] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit() {
    const n = Number(total.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    setBusy(true);
    await onFinish({ total: n, paid_by: paidBy, merchant: merchant.trim() || null });
    setBusy(false);
    setTotal(''); setMerchant(''); setPaidBy('Compartido');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full rounded-t-sheet bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-sans text-[24px] font-extrabold tracking-tightest text-ink">¿Cuánto has gastado?</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-soft text-ink-muted">
            <X size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Total</label>
        <div className="mt-1 flex items-baseline gap-2 border-b border-ink-soft pb-2">
          <input
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            aria-label="Importe total"
            className="flex-1 bg-transparent font-sans text-[40px] font-extrabold tabular-nums text-ink outline-none"
          />
          <span className="text-[20px] font-bold text-ink-muted">€</span>
        </div>

        <div className="mt-5">
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Comercio (opcional)</label>
          <input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Mercadona"
            aria-label="Comercio"
            className="mt-1 w-full border-b border-ink-soft py-2 text-[14px] outline-none focus:border-ink"
          />
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Pagado por</label>
          <PaidBySelect value={paidBy} onChange={setPaidBy} />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={busy || !total}
          className="mt-6 w-full rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Crear gasto y archivar'}
        </button>
      </div>
    </div>
  );
}
