'use client';

import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';
import { RecipeCard } from '@/components/meals/RecipeCard';
import { useRecipes } from '@/lib/hooks/use-recipes';

export default function RecipesListPage() {
  const { recipes, loading } = useRecipes();

  return (
    <main className="flex flex-col gap-4 px-1 pt-4">
      <header className="flex items-center justify-between px-4">
        <Link href="/meals" aria-label="Volver" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">Recetas</h1>
        <Link href="/meals/scan" aria-label="Añadir" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
          <Plus size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
      </header>

      {loading && <p className="px-5 text-[13px] text-ink-muted">Cargando…</p>}

      <div className="grid grid-cols-2 gap-3 px-4 pb-6">
        {recipes.length === 0 && !loading && (
          <p className="col-span-2 py-6 text-center text-[13px] text-ink-muted">
            Sin recetas. Toca + para añadir.
          </p>
        )}
        {recipes.map((r) => (
          <Link key={r.id} href={`/meals/recipes/${r.id}`} className="block">
            <RecipeCard recipe={r} />
          </Link>
        ))}
      </div>
    </main>
  );
}
