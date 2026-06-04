'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PaidBySelect } from '@/components/controls/PaidBySelect';
import type { PaidBy } from '@/lib/expenses';

interface FinishShoppingSheetProps {
  open: boolean;
  onClose: () => void;
  /** Count of items currently checked in the shopping list — drives the
   *  confirmation copy ("X productos se añadirán a la despensa"). */
  checkedCount?: number;
  onFinish: (input: { total: number; paid_by: PaidBy; merchant?: string | null }) => Promise<{ expense_id?: string; pantry_added?: number; error?: string } | void>;
}

// Two-step state machine: the user first fills the form ("review") then
// hits the action, which surfaces a confirmation gate ("confirming") with
// a clear summary of side-effects. On "Sí, finalizar" we move to
// "submitting" and call onFinish.
type Phase = 'review' | 'confirming' | 'submitting';

export function FinishShoppingSheet({ open, onClose, onFinish, checkedCount = 0 }: FinishShoppingSheetProps) {
  const [total, setTotal] = useState('');
  const [paidBy, setPaidBy] = useState<PaidBy>('Compartido');
  const [merchant, setMerchant] = useState('');
  const [phase, setPhase] = useState<Phase>('review');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset internal state when the sheet is closed externally.
  useEffect(() => {
    if (!open) {
      setPhase('review');
      setToast(null);
    }
  }, [open]);

  if (!open) return null;

  function handleClose() {
    if (phase === 'submitting') return; // don't allow closing mid-submit
    setTotal(''); setMerchant(''); setPaidBy('Compartido');
    setPhase('review');
    setToast(null);
    onClose();
  }

  function requestConfirm() {
    const n = Number(total.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    setPhase('confirming');
  }

  async function submit() {
    const n = Number(total.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    setPhase('submitting');
    const res = await onFinish({ total: n, paid_by: paidBy, merchant: merchant.trim() || null });
    const added = (res && typeof res === 'object' && 'pantry_added' in res ? res.pantry_added : undefined) ?? 0;
    if (added > 0) {
      setToast(`${added} producto${added === 1 ? '' : 's'} añadido${added === 1 ? '' : 's'} a la despensa`);
    }
    // Reset form state. Parent decides whether to close (navigates on success).
    setTotal(''); setMerchant(''); setPaidBy('Compartido');
    setPhase('review');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="w-full rounded-t-sheet bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-sans text-[24px] font-extrabold tracking-tightest text-ink">¿Cuánto has gastado?</h2>
          <button type="button" onClick={handleClose} aria-label="Cerrar"
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
          onClick={requestConfirm}
          disabled={phase === 'submitting' || !total}
          className="mt-6 w-full rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-50"
        >
          Finalizar compra
        </button>

        {toast && (
          <p className="mt-3 text-center text-[12px] font-bold text-emerald-700" role="status">
            {toast}
          </p>
        )}
      </div>

      {/* Confirmation gate — mirrors the meal-pass redeem modal: coloured
          gradient card, two-button choice, positive (green) tint because
          finalising the shop is a positive action. */}
      {(phase === 'confirming' || phase === 'submitting') && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar finalizar la compra"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-5"
          onClick={() => { if (phase !== 'submitting') setPhase('review'); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-card p-6 text-center shadow-2xl"
            style={{
              background: 'radial-gradient(120% 140% at 50% 0%, #d1fae5 0%, #6ee7b7 70%, #059669 100%)',
            }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[28px] shadow-md" aria-hidden>
              🛒
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
              Finalizar compra
            </p>
            <h2 className="mt-1 font-sans text-[22px] font-extrabold leading-tight text-white">
              ¿Confirmar finalizar la compra?
            </h2>
            <p className="mt-2 text-[12px] leading-snug text-white/90">
              {checkedCount > 0 ? (
                <>Se añadirán <b>{checkedCount}</b> producto{checkedCount === 1 ? '' : 's'} marcado{checkedCount === 1 ? '' : 's'} a la despensa</>
              ) : (
                <>No hay productos marcados — solo se registrará el gasto</>
              )}
              {' '}y la lista quedará archivada.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => { if (phase !== 'submitting') setPhase('review'); }}
                disabled={phase === 'submitting'}
                className="flex-1 rounded-full bg-white/95 py-3 text-[13px] font-bold text-ink active:scale-[0.98] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { void submit(); }}
                disabled={phase === 'submitting'}
                className="flex-1 rounded-full py-3 text-[13px] font-bold text-white active:scale-[0.98] disabled:opacity-70"
                style={{ backgroundColor: '#047857' }}
              >
                {phase === 'submitting' ? 'Guardando…' : 'Sí, finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
