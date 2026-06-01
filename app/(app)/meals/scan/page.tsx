'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { RecipeCaptureForm, type RecipeExtractInput } from '@/components/meals/RecipeCaptureForm';
import { RecipeReview, type ExtractedRecipe } from '@/components/meals/RecipeReview';
import { saveRecipe } from '@/lib/hooks/use-recipes';
import { useAthlete } from '@/lib/athlete-context';

export default function MealsScanPage() {
  const router = useRouter();
  const athlete = useAthlete();
  const [extracted, setExtracted] = useState<ExtractedRecipe | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function extract(input: RecipeExtractInput) {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/meals/extract-recipe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) { setError(await res.text()); return; }
      const data = await res.json() as ExtractedRecipe;
      // Persist the screenshot as a data URL on the recipe row. Pragmatic
      // for the prototype; a Storage bucket is the right home long-term.
      const image_url =
        input.image_base64 && input.media_type
          ? `data:${input.media_type};base64,${input.image_base64}`
          : null;
      setExtracted({
        ...data,
        source_url: input.url ?? null,
        image_url,
      });
    } finally {
      setBusy(false);
    }
  }

  async function save(payload: Parameters<NonNullable<Parameters<typeof RecipeReview>[0]['onSave']>>[0]) {
    if (!athlete) return;
    setBusy(true);
    const res = await saveRecipe({
      recipe: {
        title: payload.title,
        source_url: payload.source_url,
        source_type: payload.source_url ? 'tiktok' : 'manual',
        image_url: payload.image_url,
        prep_minutes: payload.prep_minutes,
        servings: payload.servings,
        tags: payload.tags,
        notes: null,
        created_by: athlete,
        meal_type: null,
        thumbnail_url: null,
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
        <Link href="/meals" aria-label="Volver" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">
          {extracted ? 'Confirmar receta' : 'Añadir receta'}
        </h1>
        <span aria-hidden className="h-10 w-10" />
      </header>

      {error && <p className="px-5 text-[12px] text-danger">{error}</p>}

      {!extracted && <RecipeCaptureForm onExtract={extract} busy={busy} />}
      {extracted && athlete && <RecipeReview initial={extracted} athlete={athlete} busy={busy} onSave={save} />}
    </main>
  );
}
