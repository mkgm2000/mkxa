'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, PenLine, X } from 'lucide-react';

export interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddExpenseSheet({ open, onClose }: AddExpenseSheetProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function go(path: string) {
    router.push(path);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Añadir gasto"
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-t-sheet bg-white p-6 pb-[max(env(safe-area-inset-bottom,16px),24px)] shadow-card">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-sans text-2xl font-extrabold tracking-tightest text-ink">
            Añadir gasto
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action"
          >
            <X size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => go('/expenses/scan')}
            className="flex flex-col items-start gap-3 rounded-card bg-cat-comida/30 p-4 text-left shadow-item transition-transform duration-150 active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
              <Camera size={24} strokeWidth={1.5} className="text-ink" aria-hidden />
            </span>
            <span className="font-sans text-base font-bold text-ink">Escanear factura</span>
            <span className="text-xs text-ink-muted">Foto del ticket, OCR automático.</span>
          </button>

          <button
            type="button"
            onClick={() => go('/expenses/new')}
            className="flex flex-col items-start gap-3 rounded-card bg-cat-transporte/30 p-4 text-left shadow-item transition-transform duration-150 active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
              <PenLine size={24} strokeWidth={1.5} className="text-ink" aria-hidden />
            </span>
            <span className="font-sans text-base font-bold text-ink">Añadir manual</span>
            <span className="text-xs text-ink-muted">Importe, comercio, categoría.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
