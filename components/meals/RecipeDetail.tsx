'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Hourglass, Flame, X } from 'lucide-react';
import {
  aisleLabel,
  recipeFallbackEmoji,
  recipeFallbackGradient,
  type RecipeWithDetails,
} from '@/lib/meals/recipes';
import { RecipeImageUploader } from '@/components/meals/RecipeImageUploader';
import {
  addRecipeImage,
  removeRecipeImageByUrl,
} from '@/lib/hooks/use-recipes';

interface RecipeDetailProps {
  recipe: RecipeWithDetails;
  onChange?: () => void;
}

export function RecipeDetail({ recipe, onChange }: RecipeDetailProps) {
  // Optimistic local state so the gallery feels responsive without a full
  // reload; the parent can pass `onChange` to also trigger a refresh.
  const [images, setImages] = useState<string[]>(recipe.images ?? []);
  const [busy, setBusy] = useState(false);

  const emoji = recipeFallbackEmoji(recipe.title);
  const gradient = recipeFallbackGradient(recipe.title);
  const subdir = (recipe.created_by ?? 'shared').toLowerCase();

  const handleUploaded = useCallback(
    async (url: string) => {
      setImages((arr) => [...arr, url]);
      setBusy(true);
      const res = await addRecipeImage(recipe.id, url);
      setBusy(false);
      if ('error' in res) {
        setImages((arr) => arr.filter((u) => u !== url));
        return;
      }
      onChange?.();
    },
    [recipe.id, onChange],
  );

  const handleRemove = useCallback(
    async (url: string) => {
      setImages((arr) => arr.filter((u) => u !== url));
      setBusy(true);
      const res = await removeRecipeImageByUrl(recipe.id, url);
      setBusy(false);
      if ('error' in res) {
        setImages((arr) => [...arr, url]);
        return;
      }
      onChange?.();
    },
    [recipe.id, onChange],
  );

  return (
    <article className="flex flex-col gap-5 px-5">
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-card bg-gradient-to-br ${gradient}`}
      >
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-[96px] leading-none"
            aria-hidden
          >
            {emoji}
          </div>
        )}
      </div>

      <header>
        <h1 className="font-sans text-[28px] font-extrabold leading-tight tracking-tightest text-ink">
          {recipe.title}
        </h1>
        <div className="mt-2 flex items-center gap-2 text-[13px] text-ink-muted">
          {recipe.prep_minutes != null && (
            <span className="flex items-center gap-1">
              <Hourglass size={13} strokeWidth={1.5} aria-hidden /> {recipe.prep_minutes} min
            </span>
          )}
          <span>·</span>
          <span>{recipe.servings ?? 2} raciones</span>
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Ingredientes
        </h2>
        <ul className="flex flex-col gap-1.5">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="flex items-center justify-between text-[14px] text-ink">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-hidden />
                {ing.name}
                <span className="text-[11px] text-ink-muted">{aisleLabel(ing.aisle)}</span>
              </span>
              <span className="text-[12px] tabular-nums text-ink-muted">
                {ing.quantity ?? ''}{ing.unit ? ` ${ing.unit}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Pasos</h2>
        <ol className="flex flex-col gap-3">
          {recipe.steps.map((st, i) => (
            <li key={i} className="rounded-item bg-white p-3 shadow-item">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Paso {i + 1}
              </p>
              <p className="mt-1 text-[14px] text-ink">{st.body}</p>
              {st.timer_min != null && (
                <p className="mt-1 text-[12px] text-ink-muted">{st.timer_min} min</p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Fotos
          </h2>
          <span className="text-[11px] text-ink-muted">
            {images.length} {images.length === 1 ? 'foto' : 'fotos'}
          </span>
        </div>
        {images.length > 0 && (
          <ul className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {images.map((url) => (
              <li key={url} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-24 w-24 rounded-item object-cover shadow-item"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  disabled={busy}
                  aria-label="Quitar foto"
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink shadow-action active:scale-95 disabled:opacity-50"
                >
                  <X size={12} strokeWidth={1.5} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <RecipeImageUploader
          onUploaded={handleUploaded}
          athleteSubdir={subdir}
          label="+ Añadir foto"
        />
      </section>

      <Link
        href={`/meals/cook/${recipe.id}`}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-action bg-ink py-4 text-[14px] font-bold text-white"
      >
        <Flame size={18} strokeWidth={1.5} aria-hidden /> Cocinar
      </Link>
    </article>
  );
}
