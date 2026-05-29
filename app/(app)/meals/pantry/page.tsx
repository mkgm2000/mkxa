'use client';

import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { PantryList } from '@/components/meals/PantryList';
import { AISLES, aisleLabel, type Aisle } from '@/lib/meals/recipes';
import { usePantry } from '@/lib/hooks/use-pantry';

export default function PantryPage() {
  const { items, toggleInStock, addItem } = usePantry();
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState<Aisle>('despensa');
  const [adding, setAdding] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    await addItem({ name, aisle });
    setName('');
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
            className="mb-3 w-full rounded-md border border-ink-soft px-2 py-2 text-[14px]"
          >
            {AISLES.map((a) => <option key={a} value={a}>{aisleLabel(a)}</option>)}
          </select>
          <button type="button" onClick={submit} className="w-full rounded-action bg-ink py-2.5 text-[13px] font-bold text-white">
            Añadir a despensa
          </button>
        </div>
      )}

      <PantryList items={items} onToggle={toggleInStock} />
    </main>
  );
}
