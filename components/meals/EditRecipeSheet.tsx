'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';
import { updateRecipe, updateRecipeIngredients } from '@/lib/hooks/use-recipes';
import {
  MEAL_SLOTS,
  mealSlotLabel,
  type MealSlot,
  type Recipe,
  type RecipeIngredient,
  type RecipeSourceType,
} from '@/lib/meals/recipes';

interface Props {
  recipe: Recipe;
  onClose: () => void;
}

// Local working copy of an ingredient row in the editor. We keep `quantity`
// as a string while editing so the input behaves naturally (allows empty,
// partial decimals, etc) and convert to number/null only on save.
interface DraftIngredient {
  name: string;
  quantity: string;
  unit: string;
  aisle: RecipeIngredient['aisle'];
  optional: boolean;
}

function blankIngredient(): DraftIngredient {
  return { name: '', quantity: '', unit: '', aisle: 'otros', optional: false };
}

function detectSourceType(url: string): RecipeSourceType | null {
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/^https?:\/\//i.test(url)) return 'web';
  return null;
}

// Bottom sheet that edits the basic fields of a recipe — title, source URL,
// meal type, and the ingredient list. Source type is auto-detected from
// the URL so we don't ask the user to pick. Same look + dismiss flow as
// ShoppingItemActions.
export function EditRecipeSheet({ recipe, onClose }: Props) {
  const [title, setTitle] = useState(recipe.title);
  const [url, setUrl] = useState(recipe.source_url ?? '');
  const [slot, setSlot] = useState<MealSlot | ''>((recipe.meal_type as MealSlot | null) ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ingredient editing state. We fetch on mount because the sheet only
  // receives a `Recipe`, not a `RecipeWithDetails`.
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(true);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);

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

  // One-shot fetch of the current ingredients for this recipe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: eFetch } = await supabaseClient()
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipe.id)
        .order('position');
      if (cancelled) return;
      if (eFetch) {
        setError(eFetch.message);
        setIngredientsLoading(false);
        return;
      }
      const rows = (data as RecipeIngredient[]) ?? [];
      setIngredients(rows.map((r) => ({
        name: r.name ?? '',
        quantity: r.quantity == null ? '' : String(r.quantity),
        unit: r.unit ?? '',
        aisle: r.aisle ?? 'otros',
        optional: r.optional ?? false,
      })));
      setIngredientsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [recipe.id]);

  function updateIngredient(idx: number, patch: Partial<DraftIngredient>) {
    setIngredients((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, blankIngredient()]);
    setIngredientsOpen(true);
  }

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
    if ('error' in res) { setSaving(false); setError(res.error); return; }

    // Drop fully empty rows and normalize types before persisting.
    const cleaned = ingredients
      .map((row) => ({
        name: row.name.trim(),
        quantity: row.quantity.trim() === '' ? null : Number(row.quantity.replace(',', '.')),
        unit: row.unit.trim() || null,
        aisle: row.aisle,
        optional: row.optional,
      }))
      .filter((row) => row.name.length > 0)
      .map((row, idx) => ({
        ...row,
        // Guard against NaN slipping through if the input had garbage.
        quantity: row.quantity != null && Number.isFinite(row.quantity) ? row.quantity : null,
        position: idx,
      }));

    const ingRes = await updateRecipeIngredients(recipe.id, cleaned);
    setSaving(false);
    if ('error' in ingRes) { setError(ingRes.error); return; }
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

          {/* Ingredientes — collapsible. The header doubles as the toggle. */}
          <div className="rounded-action border border-ink-soft bg-white">
            <button
              type="button"
              onClick={() => setIngredientsOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              aria-expanded={ingredientsOpen}
            >
              <span className="text-[13px] font-bold text-ink">
                Ingredientes
                <span className="ml-1.5 font-medium text-ink-muted">
                  ({ingredientsLoading ? '…' : ingredients.length})
                </span>
              </span>
              <ChevronDown
                size={16}
                strokeWidth={1.75}
                className={clsx('text-ink-muted transition-transform', ingredientsOpen && 'rotate-180')}
                aria-hidden
              />
            </button>

            {ingredientsOpen && (
              <div className="flex flex-col gap-2 border-t border-ink-soft px-3 py-3">
                {ingredientsLoading ? (
                  <p className="text-[12px] text-ink-muted">Cargando…</p>
                ) : (
                  <>
                    {ingredients.length === 0 && (
                      <p className="text-[12px] text-ink-muted">Sin ingredientes todavía.</p>
                    )}
                    {ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          value={ing.name}
                          onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                          placeholder="Ingrediente"
                          className="min-w-0 flex-1 rounded-action border border-ink-soft bg-white px-2.5 py-2 text-[13px] outline-none focus:border-ink"
                        />
                        <input
                          value={ing.quantity}
                          onChange={(e) => updateIngredient(idx, { quantity: e.target.value })}
                          inputMode="decimal"
                          placeholder="Cant."
                          className="w-16 rounded-action border border-ink-soft bg-white px-2 py-2 text-[13px] outline-none focus:border-ink"
                        />
                        <input
                          value={ing.unit}
                          onChange={(e) => updateIngredient(idx, { unit: e.target.value })}
                          placeholder="Unidad"
                          className="w-16 rounded-action border border-ink-soft bg-white px-2 py-2 text-[13px] outline-none focus:border-ink"
                        />
                        <button
                          type="button"
                          aria-label="Quitar ingrediente"
                          onClick={() => removeIngredient(idx)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted active:scale-95"
                        >
                          <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="mt-0.5 flex items-center justify-center gap-1.5 rounded-action border border-dashed border-ink-soft bg-white py-2 text-[13px] font-bold text-ink active:scale-95"
                    >
                      <Plus size={14} strokeWidth={2} aria-hidden />
                      Añadir ingrediente
                    </button>
                  </>
                )}
              </div>
            )}
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
