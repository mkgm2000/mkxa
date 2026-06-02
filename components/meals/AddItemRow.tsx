'use client';

import { useState } from 'react';
import { Plus, X, Check, Minus } from 'lucide-react';
import { AISLES, aisleLabel, type Aisle } from '@/lib/meals/recipes';

interface AddItemRowProps {
  onAdd: (input: { name: string; quantity: number | null; unit: string | null; aisle: Aisle }) => Promise<void> | void;
}

export function AddItemRow({ onAdd }: AddItemRowProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [units, setUnits] = useState(1);
  const [aisle, setAisle] = useState<Aisle>('otros');

  function reset() {
    setName('');
    setUnits(1);
    setAisle('otros');
    setOpen(false);
  }

  async function submit() {
    if (!name.trim()) return;
    const safeUnits = Number.isFinite(units) && units > 0 ? Math.trunc(units) : 1;
    await onAdd({
      name,
      quantity: safeUnits,
      unit: 'uds',
      aisle,
    });
    reset();
  }

  function handleUnitsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (raw === '') { setUnits(0); return; }
    const n = parseInt(raw, 10);
    setUnits(Number.isFinite(n) ? n : 0);
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
        className="mb-3 w-full border-b border-ink-soft py-1 text-[14px] outline-none focus:border-ink"
      />
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-muted">Unidades</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUnits((u) => Math.max(1, (Number.isFinite(u) ? u : 1) - 1))}
            aria-label="Restar unidad"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-soft text-ink active:scale-[0.97]"
          >
            <Minus size={16} strokeWidth={1.5} aria-hidden />
          </button>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            step={1}
            value={units === 0 ? '' : units}
            onChange={handleUnitsChange}
            onBlur={() => { if (!units || units < 1) setUnits(1); }}
            aria-label="Unidades"
            className="w-14 rounded-md border border-ink-soft bg-white py-1 text-center text-[16px] font-bold tabular-nums text-ink outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() => setUnits((u) => (Number.isFinite(u) ? u : 0) + 1)}
            aria-label="Sumar unidad"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-soft text-ink active:scale-[0.97]"
          >
            <Plus size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
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
        <button type="button" onClick={reset} aria-label="Cancelar"
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
