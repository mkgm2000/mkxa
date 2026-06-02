'use client';

import Link from 'next/link';
import { ChevronLeft, Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { PantryList } from '@/components/meals/PantryList';
import { AISLES, aisleLabel, type Aisle } from '@/lib/meals/recipes';
import { usePantry } from '@/lib/hooks/use-pantry';

export default function PantryPage() {
  const { items, toggleInStock, addItem, editItem, deleteItem } = usePantry();
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState<Aisle>('despensa');
  const [units, setUnits] = useState<number | ''>('');
  const [adding, setAdding] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    const u = typeof units === 'number' && units > 0 ? Math.trunc(units) : null;
    await addItem({ name, aisle, units: u });
    setName('');
    setUnits('');
    setAdding(false);
  }

  return (
    <main className="flex flex-col gap-3 px-1 pt-4 pb-6">
      <header className="flex items-center justify-between px-4">
        <Link href="/meals" aria-label="Volver" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">Despensa</h1>
        <button type="button" onClick={() => setAdding((v) => !v)} aria-label="Añadir" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
          <Plus size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </button>
      </header>

      {adding && (
        <div className="mx-4 rounded-item bg-white p-3 shadow-item">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre"
            autoFocus
            className="mb-2 w-full border-b border-ink-soft py-1 text-[14px] outline-none focus:border-ink"
          />
          <select
            value={aisle}
            onChange={(e) => setAisle(e.target.value as Aisle)}
            className="mb-2 w-full rounded-md border border-ink-soft px-2 py-2 text-[14px]"
          >
            {AISLES.map((a) => <option key={a} value={a}>{aisleLabel(a)}</option>)}
          </select>
          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="pantry-page-units" className="text-[13px] text-ink-muted">Unidades</label>
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
              id="pantry-page-units"
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
          <button type="button" onClick={submit} className="w-full rounded-action bg-ink py-2.5 text-[13px] font-bold text-white">
            Añadir a despensa
          </button>
        </div>
      )}

      <PantryList items={items} onToggle={toggleInStock} onEdit={editItem} onDelete={deleteItem} />
    </main>
  );
}
