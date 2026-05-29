'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import type { Recipe } from '@/lib/meals/recipes';

interface RecipePickerSheetProps {
  open: boolean;
  recipes: Recipe[];
  onClose: () => void;
  onPick: (recipe: Recipe) => void;
}

export function RecipePickerSheet({ open, recipes, onClose, onPick }: RecipePickerSheetProps) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return recipes;
    return recipes.filter((r) =>
      r.title.toLowerCase().includes(term) ||
      r.tags.some((t) => t.toLowerCase().includes(term)));
  }, [q, recipes]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35" onClick={onClose} role="dialog" aria-modal="true">
      <div className="max-h-[85vh] w-full overflow-hidden rounded-t-sheet bg-white shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-3">
          <h2 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">Elegir receta</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-soft text-ink-muted">
            <X size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título o tag"
          aria-label="Buscar receta"
          className="mx-5 mb-3 block w-[calc(100%-2.5rem)] border-b border-ink-soft py-2 text-[14px] outline-none focus:border-ink"
        />
        <ul className="max-h-[60vh] overflow-y-auto px-5 pb-6">
          {filtered.length === 0 && (
            <li className="py-6 text-center text-[13px] text-ink-muted">Sin resultados.</li>
          )}
          {filtered.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => { onPick(r); onClose(); }}
                className="flex w-full items-center gap-3 border-b border-ink-soft py-3 text-left"
              >
                {r.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  : <span className="h-12 w-12 rounded-lg bg-mood-happy-from" aria-hidden />}
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-[14px] font-bold text-ink">{r.title}</span>
                  <span className="block text-[12px] text-ink-muted">
                    {r.prep_minutes ? `${r.prep_minutes} min · ` : ''}{r.servings ?? 2} raciones
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
