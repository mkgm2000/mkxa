'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CookStepper } from '@/components/meals/CookStepper';
import { useRecipe } from '@/lib/hooks/use-recipes';

export default function CookPage({ params }: { params: { id: string } }) {
  const { recipe, loading } = useRecipe(params.id);

  return (
    <main className="flex flex-col gap-3 px-1 pt-4 pb-6">
      <header className="flex items-center justify-between px-4">
        <Link href={`/meals/recipes/${params.id}`} aria-label="Volver" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">
          {recipe?.title ?? 'Cocinar'}
        </h1>
        <span aria-hidden className="h-10 w-10" />
      </header>

      {loading && <p className="px-5 text-[13px] text-ink-muted">Cargando…</p>}
      {recipe && <CookStepper steps={recipe.steps} />}
    </main>
  );
}
