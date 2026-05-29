'use client';

import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { AISLES, aisleLabel, type Aisle } from '@/lib/meals/recipes';

interface AddItemRowProps {
  onAdd: (input: { name: string; quantity: number | null; unit: string | null; aisle: Aisle }) => Promise<void> | void;
}

export function AddItemRow({ onAdd }: AddItemRowProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [aisle, setAisle] = useState<Aisle>('otros');

  async function submit() {
    if (!name.trim()) return;
    const quantity = qty.trim() === '' ? null : Number(qty.replace(',', '.'));
    await onAdd({
      name,
      quantity: Number.isFinite(quantity as number) ? (quantity as number) : null,
      unit: unit.trim() === '' ? null : unit.trim(),
      aisle,
    });
    setName(''); setQty(''); setUnit(''); setAisle('otros'); setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-item border border-dashed border-ink-soft px-3 py-3 text-[13px] font-medium text-ink-muted"
      >
        <Plus size={16} strokeWidth={1.5} aria-hidden />
        Añadir item
      </button>
    );
  }

  return (
    <div className="rounded-item bg-white p-3 shadow-item">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre"
        aria-label="Nombre del item"
        className="mb-2 w-full border-b border-ink-soft py-1 text-[14px] outline-none focus:border-ink"
      />
      <div className="mb-2 flex gap-2">
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Cant."
          aria-label="Cantidad"
          inputMode="decimal"
          className="w-20 border-b border-ink-soft py-1 text-[14px] tabular-nums outline-none focus:border-ink"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unidad"
          aria-label="Unidad"
          className="flex-1 border-b border-ink-soft py-1 text-[14px] outline-none focus:border-ink"
        />
      </div>
      <select
        value={aisle}
        onChange={(e) => setAisle(e.target.value as Aisle)}
        aria-label="Sección"
        className="mb-3 w-full rounded-md border border-ink-soft bg-white px-2 py-2 text-[14px] text-ink"
      >
        {AISLES.map((a) => <option key={a} value={a}>{aisleLabel(a)}</option>)}
      </select>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} aria-label="Cancelar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-soft text-ink-muted">
          <X size={16} strokeWidth={1.5} aria-hidden />
        </button>
        <button type="button" onClick={submit} aria-label="Confirmar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
          <Check size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
