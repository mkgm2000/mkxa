'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { updateRecipe } from '@/lib/hooks/use-recipes';
import {
  MEAL_SLOTS,
  mealSlotLabel,
  type MealSlot,
  type Recipe,
  type RecipeSourceType,
} from '@/lib/meals/recipes';

interface Props {
  recipe: Recipe;
  onClose: () => void;
}

function detectSourceType(url: string): RecipeSourceType | null {
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/^https?:\/\//i.test(url)) return 'web';
  return null;
}

// Bottom sheet that edits the basic fields of a recipe — title, source URL,
// meal type. Source type is auto-detected from the URL so we don't ask the
// user to pick. Same look + dismiss flow as ShoppingItemActions.
export function EditRecipeSheet({ recipe, onClose }: Props) {
  const [title, setTitle] = useState(recipe.title);
  const [url, setUrl] = useState(recipe.source_url ?? '');
  const [slot, setSlot] = useState<MealSlot | ''>((recipe.meal_type as MealSlot | null) ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function k(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  async function handleSave() {
    if (!title.trim()) { setError('El título no puede estar vacío'); return; }
    setSaving(true);
    setError(null);
    const trimmedUrl = url.trim() || null;
    const res = await updateRecipe(recipe.id, {
      title: title.trim(),
      source_url: trimmedUrl,
      // Re-derive source type when the URL changes so the player picks
      // the right embed. If the user clears the URL we keep the existing
      // type (so an old TikTok recipe doesn't become 'manual' just
      // because its link got wiped).
      source_type: trimmedUrl ? detectSourceType(trimmedUrl) ?? recipe.source_type : recipe.source_type,
      meal_type: slot || null,
    });
    setSaving(false);
    if ('error' in res) { setError(res.error); return; }
    onClose();
  }

  const detected = url ? detectSourceType(url) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editar receta"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-[20px] font-extrabold text-ink">
            Editar receta
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

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-[13px] text-ink">
            Título
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="rounded-action border border-ink-soft bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-[13px] text-ink">
            Link
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="tiktok.com/... o instagram.com/reel/..."
              className="rounded-action border border-ink-soft bg-white px-3 py-2.5 text-[14px] outline-none focus:border-ink"
            />
            {detected && (
              <span className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Detectado: {detected}
              </span>
            )}
          </label>

          <div>
            <p className="mb-1.5 text-[13px] text-ink">Tipo de comida</p>
            <div className="grid grid-cols-3 gap-1 rounded-full bg-ink-soft/40 p-1">
              {(['', ...MEAL_SLOTS] as const).map((s) => {
                const active = slot === s;
                const label = s === '' ? 'Sin tipo' : mealSlotLabel(s);
                return (
                  <button
                    key={s || 'none'}
                    type="button"
                    onClick={() => setSlot(s as MealSlot | '')}
                    className={clsx(
                      'rounded-full py-1.5 text-[11px] transition-colors',
                      active ? 'bg-ink text-white font-bold' : 'text-ink-muted font-medium',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-action bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</p>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-action border border-ink-soft bg-white py-3 text-[14px] font-bold text-ink active:scale-95 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 rounded-action bg-ink py-3 text-[14px] font-bold text-white active:scale-95 disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
