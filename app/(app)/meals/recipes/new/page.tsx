'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';
import { RecipeReview, type ExtractedRecipe } from '@/components/meals/RecipeReview';
import { saveRecipe } from '@/lib/hooks/use-recipes';
import { useAthlete } from '@/lib/athlete-context';
import { RECIPE_TEMPLATES, type RecipeTemplate } from '@/lib/meals/recipe-templates';

function templateToExtracted(t: RecipeTemplate): ExtractedRecipe {
  return {
    title: t.title,
    prep_minutes: t.prep_minutes,
    servings: t.servings,
    tags: t.tags,
    ingredients: t.ingredients.map((i) => ({ ...i })),
    steps: t.steps.map((s) => ({ ...s })),
  };
}

const BLANK: ExtractedRecipe = {
  title: '',
  prep_minutes: null,
  servings: 2,
  tags: [],
  ingredients: [],
  steps: [],
};

export default function NewRecipePage() {
  const router = useRouter();
  const athlete = useAthlete();
  const [picked, setPicked] = useState<ExtractedRecipe | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(payload: Parameters<NonNullable<Parameters<typeof RecipeReview>[0]['onSave']>>[0]) {
    if (!athlete) return;
    setBusy(true);
    const res = await saveRecipe({
      recipe: {
        title: payload.title,
        source_url: null,
        source_type: 'manual',
        image_url: null,
        prep_minutes: payload.prep_minutes,
        servings: payload.servings,
        tags: payload.tags,
        notes: null,
        created_by: athlete,
      },
      ingredients: payload.ingredients,
      steps: payload.steps,
    });
    setBusy(false);
    if ('id' in res) router.push(`/meals/recipes/${res.id}`);
    else setError(res.error);
  }

  return (
    <main className="flex flex-col gap-5 px-1 pt-4">
      <header className="flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => (picked ? setPicked(null) : router.back())}
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </button>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">
          {picked ? 'Nueva receta' : 'Elige una plantilla'}
        </h1>
        <span aria-hidden className="h-10 w-10" />
      </header>

      {error && <p className="px-5 text-[12px] text-danger">{error}</p>}

      {!picked && (
        <section className="flex flex-col gap-4 px-4 pb-6">
          <p className="px-1 text-[13px] text-ink-muted">
            Empieza con una receta hecha y cambia lo que necesites: cantidades, ingredientes, pasos.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {RECIPE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPicked(templateToExtracted(t))}
                className="flex flex-col items-start gap-2 rounded-card bg-white p-3 text-left shadow-card transition-transform duration-150 active:scale-[0.98]"
              >
                <span className="text-[28px] leading-none" aria-hidden>{t.emoji}</span>
                <span className="font-sans text-[14px] font-bold leading-tight text-ink">{t.title}</span>
                <span className="flex flex-wrap gap-1">
                  {t.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-ink-soft/30 px-2 py-0.5 text-[10px] font-medium text-ink-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
                <span className="mt-auto flex gap-2 text-[11px] text-ink-muted">
                  <span>{t.prep_minutes} min</span>
                  <span>·</span>
                  <span>{t.servings} {t.servings === 1 ? 'ración' : 'raciones'}</span>
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPicked(BLANK)}
            className="flex items-center justify-center gap-2 rounded-card border-2 border-dashed border-ink-soft bg-white/50 py-3 text-[13px] font-medium text-ink-muted"
          >
            <Plus size={16} strokeWidth={1.5} aria-hidden />
            Empezar en blanco
          </button>

          <Link
            href="/meals/scan"
            className="rounded-card bg-ink py-3 text-center text-[13px] font-bold text-white"
          >
            O importar desde TikTok / web
          </Link>
        </section>
      )}

      {picked && athlete && (
        <RecipeReview initial={picked} athlete={athlete} busy={busy} onSave={save} />
      )}
    </main>
  );
}
