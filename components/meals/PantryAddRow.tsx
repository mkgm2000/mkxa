'use client';

import { useState } from 'react';
import { Plus, Check, X, Minus } from 'lucide-react';
import { AISLES, aisleLabel, type Aisle } from '@/lib/meals/recipes';
import { inferAisle } from '@/lib/meals/ingredient-aisles';

interface PantryAddRowProps {
  onAdd: (input: { name: string; aisle: Aisle; units?: number | null }) => Promise<void> | void;
}

export function PantryAddRow({ onAdd }: PantryAddRowProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState<Aisle>('otros');
  const [units, setUnits] = useState<number | ''>('');

  async function submit() {
    const n = name.trim();
    if (!n) return;
    const u = typeof units === 'number' && units > 0 ? Math.trunc(units) : null;
    await onAdd({ name: n, aisle, units: u });
    setName(''); setAisle('otros'); setUnits(''); setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-item border border-dashed border-ink-soft bg-white/40 px-3 py-3 text-[13px] font-medium text-ink-muted"
      >
        <Plus size={16} strokeWidth={1.5} aria-hidden />
        Añadir a la despensa
      </button>
    );
  }

  return (
    <div className="mx-2 rounded-item bg-white p-3 shadow-item">
      <input
        autoFocus
        value={name}
        onChange={(e) => {
          const v = e.target.value;
          setName(v);
          if (aisle === 'otros' && v.trim().length >= 3) {
            const guess = inferAisle(v);
            if (guess !== 'otros') setAisle(guess);
          }
        }}
        placeholder="ej: leche, aceite, pollo…"
        aria-label="Item de despensa"
        className="mb-2 w-full border-b border-ink-soft py-1 text-[14px] outline-none focus:border-ink"
      />
      <select
        value={aisle}
        onChange={(e) => setAisle(e.target.value as Aisle)}
        aria-label="Sección"
        className="mb-2 w-full rounded-md border border-ink-soft bg-white px-2 py-2 text-[14px] text-ink"
      >
        {AISLES.map((a) => <option key={a} value={a}>{aisleLabel(a)}</option>)}
      </select>
      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="pantry-units" className="text-[13px] text-ink-muted">Unidades</label>
        <button
          type="button"
          onClick={() => setUnits((u) => {
            const n = typeof u === 'number' ? u : 0;
            return Math.max(0, n - 1) || '';
          })}
          aria-label="Restar unidad"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-soft text-ink-muted"
        >
          <Minus size={14} strokeWidth={1.5} aria-hidden />
        </button>
        <input
          id="pantry-units"
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          step={1}
          value={units}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') { setUnits(''); return; }
            const n = parseInt(raw, 10);
            setUnits(Number.isFinite(n) && n > 0 ? n : '');
          }}
          placeholder="–"
          aria-label="Unidades"
          className="h-8 w-16 rounded-md border border-ink-soft bg-white text-center text-[14px] outline-none focus:border-ink"
        />
        <button
          type="button"
          onClick={() => setUnits((u) => (typeof u === 'number' ? u + 1 : 1))}
          aria-label="Sumar unidad"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-soft text-ink-muted"
        >
          <Plus size={14} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} aria-label="Cancelar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-soft text-ink-muted">
          <X size={16} strokeWidth={1.5} aria-hidden />
        </button>
        <button type="button" onClick={submit} aria-label="Añadir"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
          <Check size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
