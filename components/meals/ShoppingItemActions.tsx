'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, X, Minus, Plus } from 'lucide-react';
import { AISLES, aisleLabel, type Aisle, type ShoppingItem } from '@/lib/meals/recipes';

interface Props {
  item: ShoppingItem;
  onClose: () => void;
  onSave: (patch: { name: string; quantity: number | null; aisle: Aisle }) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

// Long-press action sheet for shopping items. Two modes: a quick chooser
// (Editar / Eliminar) and an inline edit form. Same component because the
// transition between them is one-tap and using a single sheet keeps the
// keyboard focus on phones from jumping.
export function ShoppingItemActions({ item, onClose, onSave, onDelete }: Props) {
  const [mode, setMode] = useState<'choose' | 'edit' | 'confirmDelete'>('choose');
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState<number>(item.quantity ?? 1);
  const [aisle, setAisle] = useState<Aisle>(item.aisle);
  const [saving, setSaving] = useState(false);

  // Body scroll lock — same pattern other meals sheets use.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Esc closes whichever step is showing.
  useEffect(() => {
    function k(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), quantity: Math.max(1, Math.trunc(qty || 1)), aisle });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'edit' ? 'Editar artículo' : mode === 'confirmDelete' ? 'Confirmar eliminación' : 'Acciones del artículo'}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="truncate font-sans text-[18px] font-extrabold text-ink">
            {item.name}
          </h3>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
          >
            <X size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
          </button>
        </div>

        {mode === 'choose' && (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="flex items-center gap-3 rounded-action border border-ink-soft bg-white px-4 py-3 text-left text-[14px] font-bold text-ink active:scale-[0.98]"
            >
              <Pencil size={18} strokeWidth={1.75} aria-hidden />
              Editar
            </button>
            <button
              type="button"
              onClick={() => setMode('confirmDelete')}
              className="flex items-center gap-3 rounded-action border border-danger/30 bg-white px-4 py-3 text-left text-[14px] font-bold text-danger active:scale-[0.98]"
            >
              <Trash2 size={18} strokeWidth={1.75} aria-hidden />
              Eliminar
            </button>
          </div>
        )}

        {mode === 'edit' && (
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-[13px] text-ink">
              Nombre
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="rounded-action border border-ink-soft bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink"
              />
            </label>

            <label className="flex flex-col gap-1 text-[13px] text-ink">
              Categoría
              <select
                value={aisle}
                onChange={(e) => setAisle(e.target.value as Aisle)}
                aria-label="Sección"
                className="rounded-md border border-ink-soft bg-white px-2 py-2 text-[14px] text-ink"
              >
                {AISLES.map((a) => <option key={a} value={a}>{aisleLabel(a)}</option>)}
              </select>
            </label>

            <div>
              <p className="mb-1.5 text-[13px] text-ink">Unidades</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Restar"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-action border border-ink-soft bg-white text-ink active:scale-95"
                >
                  <Minus size={18} strokeWidth={2} aria-hidden />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  step={1}
                  value={qty}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setQty(Number.isFinite(n) && n > 0 ? n : 1);
                  }}
                  className="h-11 w-20 rounded-action border border-ink-soft bg-white text-center text-[16px] font-bold tabular-nums text-ink outline-none focus:border-ink"
                />
                <button
                  type="button"
                  aria-label="Sumar"
                  onClick={() => setQty((q) => q + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-action border border-ink-soft bg-white text-ink active:scale-95"
                >
                  <Plus size={18} strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('choose')}
                disabled={saving}
                className="flex-1 rounded-action border border-ink-soft bg-white py-3 text-[14px] font-bold text-ink active:scale-95 disabled:opacity-40"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 rounded-action bg-ink py-3 text-[14px] font-bold text-white active:scale-95 disabled:opacity-40"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {mode === 'confirmDelete' && (
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-[13px] text-ink-muted">
              Se eliminará <strong className="text-ink">{item.name}</strong> de la lista. No se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('choose')}
                disabled={saving}
                className="flex-1 rounded-action border border-ink-soft bg-white py-3 text-[14px] font-bold text-ink active:scale-95 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 rounded-action bg-danger py-3 text-[14px] font-bold text-white active:scale-95 disabled:opacity-40"
              >
                {saving ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
