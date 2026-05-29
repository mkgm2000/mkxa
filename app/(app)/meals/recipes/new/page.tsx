'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { RecipeReview, type ExtractedRecipe } from '@/components/meals/RecipeReview';
import { saveRecipe } from '@/lib/hooks/use-recipes';
import { useAthlete } from '@/lib/athlete-context';

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
        <Link href="/meals/recipes" aria-label="Volver" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">Nueva receta</h1>
        <span aria-hidden className="h-10 w-10" />
      </header>
      {error && <p className="px-5 text-[12px] text-danger">{error}</p>}
      {athlete && <RecipeReview initial={BLANK} athlete={athlete} busy={busy} onSave={save} />}
    </main>
  );
}
