'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AISLES, aisleLabel, type Aisle, type RecipeIngredient, type RecipeStep } from '@/lib/meals/recipes';

export interface ExtractedRecipe {
  title: string;
  prep_minutes: number | null;
  servings: number | null;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  source_url?: string | null;
  image_url?: string | null;
  confidence?: number;
}

interface RecipeReviewProps {
  initial: ExtractedRecipe;
  athlete: 'MK' | 'Xabi';
  busy?: boolean;
  onSave: (recipe: Required<Pick<ExtractedRecipe, 'title' | 'prep_minutes' | 'servings' | 'tags' | 'ingredients' | 'steps'>> & { source_url: string | null; image_url: string | null }) => Promise<void>;
}

export function RecipeReview({ initial, busy, onSave }: RecipeReviewProps) {
  const [title, setTitle] = useState(initial.title);
  const [prep, setPrep] = useState(initial.prep_minutes ?? 0);
  const [servings, setServings] = useState(initial.servings ?? 2);
  const [tags, setTags] = useState(initial.tags.join(', '));
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(initial.ingredients);
  const [steps, setSteps] = useState<RecipeStep[]>(initial.steps);

  function updateIng(i: number, patch: Partial<RecipeIngredient>) {
    setIngredients((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removeIng(i: number) {
    setIngredients((arr) => arr.filter((_, idx) => idx !== i));
  }
  function addIng() {
    setIngredients((arr) => [...arr, { name: '', quantity: null, unit: null, aisle: 'otros' }]);
  }

  function updateStep(i: number, patch: Partial<RecipeStep>) {
    setSteps((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removeStep(i: number) {
    setSteps((arr) => arr.filter((_, idx) => idx !== i));
  }
  function addStep() {
    setSteps((arr) => [...arr, { position: arr.length + 1, body: '', timer_min: null }]);
  }

  async function submit() {
    await onSave({
      title: title.trim(),
      prep_minutes: prep || null,
      servings: servings || null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      ingredients,
      steps,
      source_url: initial.source_url ?? null,
      image_url: initial.image_url ?? null,
    });
  }

  return (
    <section className="flex flex-col gap-5 px-5 pb-6">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Título</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Título"
          className="mt-1 w-full border-b border-ink-soft py-2 font-sans text-[18px] font-bold outline-none focus:border-ink"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Tiempo (min)</span>
          <input
            type="number"
            value={prep}
            onChange={(e) => setPrep(Number(e.target.value))}
            className="mt-1 border-b border-ink-soft py-1 text-[14px] tabular-nums outline-none focus:border-ink"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Raciones</span>
          <input
            type="number"
            value={servings}
            onChange={(e) => setServings(Number(e.target.value))}
            className="mt-1 border-b border-ink-soft py-1 text-[14px] tabular-nums outline-none focus:border-ink"
          />
        </label>
      </div>

      <label className="flex flex-col">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Tags (coma)</span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="pasta, rápido"
          className="mt-1 border-b border-ink-soft py-1 text-[14px] outline-none focus:border-ink"
        />
      </label>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Ingredientes</h3>
          <button type="button" onClick={addIng} className="flex items-center gap-1 text-[12px] font-medium text-ink">
            <Plus size={14} strokeWidth={1.5} aria-hidden /> añadir
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {ingredients.map((ing, i) => (
            <li key={i} className="rounded-item bg-white p-2 shadow-item">
              <div className="flex gap-2">
                <input
                  value={ing.name}
                  onChange={(e) => updateIng(i, { name: e.target.value })}
                  placeholder="Nombre"
                  className="flex-1 border-b border-ink-soft px-1 py-1 text-[13px] outline-none focus:border-ink"
                />
                <button type="button" onClick={() => removeIng(i)} aria-label="Quitar" className="text-ink-muted">
                  <Trash2 size={14} strokeWidth={1.5} aria-hidden />
                </button>
              </div>
              <div className="mt-1 flex gap-2">
                <input
                  value={ing.quantity ?? ''}
                  onChange={(e) => updateIng(i, { quantity: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Cant."
                  inputMode="decimal"
                  className="w-20 border-b border-ink-soft px-1 py-1 text-[13px] tabular-nums outline-none focus:border-ink"
                />
                <input
                  value={ing.unit ?? ''}
                  onChange={(e) => updateIng(i, { unit: e.target.value || null })}
                  placeholder="Unidad"
                  className="w-24 border-b border-ink-soft px-1 py-1 text-[13px] outline-none focus:border-ink"
                />
                <select
                  value={ing.aisle}
                  onChange={(e) => updateIng(i, { aisle: e.target.value as Aisle })}
                  className="flex-1 rounded-md border border-ink-soft px-1 py-1 text-[12px]"
                >
                  {AISLES.map((a) => <option key={a} value={a}>{aisleLabel(a)}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Pasos</h3>
          <button type="button" onClick={addStep} className="flex items-center gap-1 text-[12px] font-medium text-ink">
            <Plus size={14} strokeWidth={1.5} aria-hidden /> añadir
          </button>
        </div>
        <ol className="flex flex-col gap-2">
          {steps.map((st, i) => (
            <li key={i} className="rounded-item bg-white p-2 shadow-item">
              <div className="flex gap-2">
                <span className="pt-1 text-[11px] font-bold text-ink-muted tabular-nums">{i + 1}</span>
                <textarea
                  value={st.body}
                  onChange={(e) => updateStep(i, { body: e.target.value })}
                  placeholder="Cuece la pasta…"
                  rows={2}
                  className="flex-1 border-b border-ink-soft px-1 py-1 text-[13px] outline-none focus:border-ink"
                />
                <button type="button" onClick={() => removeStep(i)} aria-label="Quitar" className="text-ink-muted">
                  <Trash2 size={14} strokeWidth={1.5} aria-hidden />
                </button>
              </div>
              <label className="mt-1 block">
                <input
                  type="number"
                  value={st.timer_min ?? ''}
                  onChange={(e) => updateStep(i, { timer_min: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Timer (min)"
                  className="w-32 border-b border-ink-soft px-1 py-1 text-[12px] tabular-nums outline-none focus:border-ink"
                />
              </label>
            </li>
          ))}
        </ol>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={busy || !title}
        className="w-full rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-40"
      >
        {busy ? 'Guardando…' : 'Guardar receta'}
      </button>
    </section>
  );
}
