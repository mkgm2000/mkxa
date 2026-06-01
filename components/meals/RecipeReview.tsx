'use client';

import { useState } from 'react';
import { Plus, Trash2, Sparkles, X } from 'lucide-react';
import {
  AISLES,
  aisleLabel,
  recipeFallbackEmoji,
  recipeFallbackGradient,
  type Aisle,
  type RecipeIngredient,
  type RecipeStep,
} from '@/lib/meals/recipes';
import { COMMON_INGREDIENTS, inferAisle } from '@/lib/meals/ingredient-aisles';
import { RecipeImageUploader } from '@/components/meals/RecipeImageUploader';

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
  onSave: (
    recipe: Required<
      Pick<ExtractedRecipe, 'title' | 'prep_minutes' | 'servings' | 'tags' | 'ingredients' | 'steps'>
    > & {
      source_url: string | null;
      image_url: string | null;
      images?: string[];
    },
  ) => Promise<void>;
}

function blankIng(): RecipeIngredient {
  return { name: '', quantity: null, unit: null, aisle: 'otros' };
}
function blankStep(position: number): RecipeStep {
  return { position, body: '', timer_min: null };
}

const AISLE_DOT: Record<Aisle, string> = {
  frutas_verduras: 'bg-emerald-300',
  pescaderia: 'bg-sky-300',
  carniceria: 'bg-rose-300',
  lacteos: 'bg-amber-200',
  panaderia: 'bg-orange-300',
  despensa: 'bg-stone-300',
  congelados: 'bg-cyan-200',
  bebidas: 'bg-blue-300',
  limpieza: 'bg-violet-300',
  otros: 'bg-ink-soft',
};

export function RecipeReview({ initial, athlete, busy, onSave }: RecipeReviewProps) {
  const [title, setTitle] = useState(initial.title);
  const [prep, setPrep] = useState(initial.prep_minutes ?? 0);
  const [servings, setServings] = useState(initial.servings ?? 2);
  const [tags, setTags] = useState(initial.tags.join(', '));
  const [imageUrl, setImageUrl] = useState<string | null>(initial.image_url ?? null);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initial.ingredients.length > 0 ? initial.ingredients : Array.from({ length: 5 }, blankIng),
  );
  const [steps, setSteps] = useState<RecipeStep[]>(
    initial.steps.length > 0 ? initial.steps : Array.from({ length: 3 }, (_, i) => blankStep(i + 1)),
  );

  function updateIng(i: number, patch: Partial<RecipeIngredient>) {
    setIngredients((arr) => {
      const next = arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x));
      if (patch.name !== undefined) {
        const auto = inferAisle(patch.name);
        next[i] = { ...next[i], aisle: auto };
      }
      // Auto-extend: if user is typing in the last row's name, append a fresh empty.
      const last = next[next.length - 1];
      if (last && last.name.trim().length > 0) next.push(blankIng());
      return next;
    });
  }
  function removeIng(i: number) {
    setIngredients((arr) => {
      const next = arr.filter((_, idx) => idx !== i);
      if (next.length === 0 || next[next.length - 1].name.trim().length > 0) next.push(blankIng());
      return next;
    });
  }
  function addCommon(c: (typeof COMMON_INGREDIENTS)[number]) {
    setIngredients((arr) => {
      const cleaned = arr.filter((x) => x.name.trim().length > 0 || x.quantity != null);
      cleaned.push({
        name: c.name,
        quantity: c.quantity,
        unit: c.unit,
        aisle: inferAisle(c.name),
      });
      cleaned.push(blankIng());
      return cleaned;
    });
  }

  function updateStep(i: number, patch: Partial<RecipeStep>) {
    setSteps((arr) => {
      const next = arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x));
      const last = next[next.length - 1];
      if (last && last.body.trim().length > 0) {
        next.push(blankStep(next.length + 1));
      }
      return next;
    });
  }
  function removeStep(i: number) {
    setSteps((arr) => {
      const next = arr.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, position: idx + 1 }));
      if (next.length === 0 || next[next.length - 1].body.trim().length > 0) {
        next.push(blankStep(next.length + 1));
      }
      return next;
    });
  }

  async function submit() {
    await onSave({
      title: title.trim(),
      prep_minutes: prep || null,
      servings: servings || null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      ingredients: ingredients
        .filter((x) => x.name.trim().length > 0)
        .map((x, idx) => ({ ...x, position: idx })),
      steps: steps
        .filter((x) => x.body.trim().length > 0)
        .map((x, idx) => ({ ...x, position: idx + 1 })),
      source_url: initial.source_url ?? null,
      image_url: imageUrl,
      images: extraImages,
    });
  }

  const fallbackEmoji = recipeFallbackEmoji(title);
  const fallbackGradient = recipeFallbackGradient(title);
  const athleteSubdir = athlete.toLowerCase();

  return (
    <section className="flex flex-col gap-5 px-5 pb-6">
      <div className="rounded-card bg-white p-4 shadow-card">
        <div className="mb-3 flex flex-col gap-2">
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Foto principal
          </label>
          <div
            className={`relative aspect-[4/3] w-full overflow-hidden rounded-item bg-gradient-to-br ${fallbackGradient}`}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[64px]" aria-hidden>
                {fallbackEmoji}
              </div>
            )}
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                aria-label="Quitar foto principal"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink shadow-action active:scale-95"
              >
                <X size={14} strokeWidth={1.5} aria-hidden />
              </button>
            )}
          </div>
          <RecipeImageUploader
            onUploaded={(url) => setImageUrl(url)}
            athleteSubdir={athleteSubdir}
            label={imageUrl ? 'Cambiar foto' : 'Añadir foto'}
          />
        </div>

        <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Título
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Título"
          placeholder="ej: Pasta carbonara"
          className="mt-1 w-full bg-transparent py-1 font-sans text-[20px] font-bold text-ink outline-none placeholder:text-ink-soft"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 rounded-item bg-ink-soft/20 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Tiempo
            </span>
            <div className="flex items-baseline gap-1">
              <input
                aria-label="Tiempo (min)"
                type="number"
                value={prep}
                onChange={(e) => setPrep(Number(e.target.value))}
                className="w-12 bg-transparent text-[16px] font-bold tabular-nums text-ink outline-none"
              />
              <span className="text-[12px] text-ink-muted">min</span>
            </div>
          </label>
          <label className="flex flex-col gap-1 rounded-item bg-ink-soft/20 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Raciones
            </span>
            <input
              aria-label="Raciones"
              type="number"
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className="w-12 bg-transparent text-[16px] font-bold tabular-nums text-ink outline-none"
            />
          </label>
        </div>
        <label className="mt-3 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Tags
          </span>
          <input
            aria-label="Tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="pasta, rápido, vegetariano"
            className="mt-1 bg-transparent py-1 text-[14px] text-ink outline-none placeholder:text-ink-soft"
          />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Ingredientes
          </h3>
          <span className="text-[11px] text-ink-muted">
            {ingredients.filter((x) => x.name.trim()).length} añadidos
          </span>
        </div>

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {COMMON_INGREDIENTS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => addCommon(c)}
              className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-ink shadow-item active:scale-95"
            >
              <Sparkles size={12} strokeWidth={1.5} className="text-ink-muted" aria-hidden />
              {c.name}
            </button>
          ))}
        </div>

        <ul className="flex flex-col gap-2">
          {ingredients.map((ing, i) => (
            <li key={i} className="rounded-item bg-white p-3 shadow-item">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${AISLE_DOT[ing.aisle]}`}
                  aria-label={aisleLabel(ing.aisle)}
                />
                <input
                  aria-label={`Ingrediente ${i + 1}`}
                  value={ing.name}
                  onChange={(e) => updateIng(i, { name: e.target.value })}
                  placeholder={i === 0 ? 'Empieza a escribir…' : 'Otro ingrediente'}
                  className="flex-1 bg-transparent py-1 text-[14px] font-medium text-ink outline-none placeholder:text-ink-soft"
                />
                {ing.name.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => removeIng(i)}
                    aria-label={`Quitar ${ing.name}`}
                    className="text-ink-soft active:text-ink"
                  >
                    <Trash2 size={14} strokeWidth={1.5} aria-hidden />
                  </button>
                )}
              </div>
              {ing.name.trim().length > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    aria-label="Cantidad"
                    value={ing.quantity ?? ''}
                    onChange={(e) =>
                      updateIng(i, { quantity: e.target.value ? Number(e.target.value) : null })
                    }
                    placeholder="Cant."
                    inputMode="decimal"
                    className="w-16 rounded-full bg-ink-soft/20 px-3 py-1 text-[13px] tabular-nums text-ink outline-none placeholder:text-ink-muted"
                  />
                  <input
                    aria-label="Unidad"
                    value={ing.unit ?? ''}
                    onChange={(e) => updateIng(i, { unit: e.target.value || null })}
                    placeholder="g, ml, cda…"
                    className="w-24 rounded-full bg-ink-soft/20 px-3 py-1 text-[13px] text-ink outline-none placeholder:text-ink-muted"
                  />
                  <select
                    aria-label="Pasillo"
                    value={ing.aisle}
                    onChange={(e) => updateIng(i, { aisle: e.target.value as Aisle })}
                    className="flex-1 rounded-full bg-ink-soft/20 px-3 py-1 text-[12px] text-ink outline-none"
                  >
                    {AISLES.map((a) => (
                      <option key={a} value={a}>
                        {aisleLabel(a)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Más fotos
          </h3>
          <span className="text-[11px] text-ink-muted">
            {extraImages.length} {extraImages.length === 1 ? 'foto' : 'fotos'}
          </span>
        </div>
        {extraImages.length > 0 && (
          <ul className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {extraImages.map((url, i) => (
              <li key={url} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-item object-cover shadow-item"
                />
                <button
                  type="button"
                  onClick={() =>
                    setExtraImages((arr) => arr.filter((_, idx) => idx !== i))
                  }
                  aria-label={`Quitar foto ${i + 1}`}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink shadow-action active:scale-95"
                >
                  <X size={12} strokeWidth={1.5} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <RecipeImageUploader
          onUploaded={(url) => setExtraImages((arr) => [...arr, url])}
          athleteSubdir={athleteSubdir}
          label="+ Añadir imagen"
        />
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Pasos
          </h3>
          <span className="text-[11px] text-ink-muted">
            {steps.filter((s) => s.body.trim()).length} pasos
          </span>
        </div>
        <ol className="flex flex-col gap-2">
          {steps.map((st, i) => (
            <li key={i} className="rounded-item bg-white p-3 shadow-item">
              <div className="flex items-start gap-2">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white tabular-nums">
                  {i + 1}
                </span>
                <textarea
                  aria-label={`Paso ${i + 1}`}
                  value={st.body}
                  onChange={(e) => updateStep(i, { body: e.target.value })}
                  placeholder={i === 0 ? 'Describe el primer paso…' : 'Siguiente paso…'}
                  rows={2}
                  className="flex-1 resize-none bg-transparent py-1 text-[14px] text-ink outline-none placeholder:text-ink-soft"
                />
                {st.body.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    aria-label={`Quitar paso ${i + 1}`}
                    className="mt-1 text-ink-soft active:text-ink"
                  >
                    <Trash2 size={14} strokeWidth={1.5} aria-hidden />
                  </button>
                )}
              </div>
              {st.body.trim().length > 0 && (
                <label className="mt-1.5 flex items-center gap-2 pl-8">
                  <span className="text-[11px] text-ink-muted">Timer</span>
                  <input
                    aria-label="Timer en minutos"
                    type="number"
                    value={st.timer_min ?? ''}
                    onChange={(e) =>
                      updateStep(i, { timer_min: e.target.value ? Number(e.target.value) : null })
                    }
                    placeholder="—"
                    className="w-16 rounded-full bg-ink-soft/20 px-3 py-1 text-[12px] tabular-nums text-ink outline-none placeholder:text-ink-muted"
                  />
                  <span className="text-[11px] text-ink-muted">min</span>
                </label>
              )}
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setSteps((arr) => [...arr, blankStep(arr.length + 1)])}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-item bg-white py-2 text-[12px] font-medium text-ink-muted shadow-item active:scale-99"
        >
          <Plus size={14} strokeWidth={1.5} aria-hidden /> añadir paso
        </button>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={busy || !title.trim() || ingredients.filter((x) => x.name.trim()).length === 0}
        className="w-full rounded-action bg-ink py-4 text-[14px] font-bold text-white transition-transform duration-150 active:scale-95 disabled:opacity-40"
      >
        {busy ? 'Guardando…' : 'Guardar receta'}
      </button>
    </section>
  );
}
