'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { BlockData } from './BlockRow';

export interface AddBlockRowProps {
  onAdd: (block: BlockData) => void;
}

export function AddBlockRow({ onAdd }: AddBlockRowProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [sets, setSets] = useState('');
  const [load, setLoad] = useState('');

  function reset() { setName(''); setSets(''); setLoad(''); setOpen(false); }

  function confirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ name: trimmed, sets: sets.trim(), load: load.trim() });
    reset();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-item border border-dashed border-ink-soft bg-transparent px-3 py-2.5 text-[12px] font-semibold text-ink-muted transition-transform duration-150 active:scale-[0.99]"
      >
        <Plus size={14} strokeWidth={1.5} aria-hidden />
        Añadir bloque
      </button>
    );
  }

  return (
    <div className="rounded-item bg-white p-3 shadow-item">
      <label className="block">
        <span className="sr-only">Ejercicio</span>
        <input
          aria-label="Ejercicio"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del ejercicio"
          autoFocus
          className="w-full rounded-md border border-ink-soft bg-white px-2.5 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
        />
      </label>
      <div className="mt-2 flex gap-2">
        <label className="block w-28 flex-shrink-0">
          <span className="sr-only">Series</span>
          <input
            aria-label="Series"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            placeholder="Series"
            className="w-full rounded-md border border-ink-soft bg-white px-2.5 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
          />
        </label>
        <label className="block flex-1">
          <span className="sr-only">Carga</span>
          <input
            aria-label="Carga"
            value={load}
            onChange={(e) => setLoad(e.target.value)}
            placeholder="Carga / nota"
            className="w-full rounded-md border border-ink-soft bg-white px-2.5 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="flex-1 rounded-md border border-ink-soft px-3 py-2 text-[12px] font-semibold text-ink-muted transition-transform duration-150 active:scale-95"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirm}
          className="flex-1 rounded-md border border-ink bg-ink px-3 py-2 text-[12px] font-semibold text-white transition-transform duration-150 active:scale-95"
        >
          Añadir
        </button>
      </div>
    </div>
  );
}
