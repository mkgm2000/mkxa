import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExternalLink, Hourglass, Users } from 'lucide-react';
import { supabaseServer } from '@/lib/supabase/server';
import type {
  Recipe,
  RecipeIngredient,
  RecipeStep,
} from '@/lib/meals/recipes';

// Public read-only recipe page. Uses the anon Supabase key directly —
// RLS is open project-wide (see migrations) so this is the same access a
// signed-in MK/Xabi session has. NOTE: links are unauthenticated by
// design for the MVP — see lib/hooks/use-share.ts for the rationale.

interface RecipeDetailRow extends Recipe {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

async function fetchRecipe(id: string): Promise<RecipeDetailRow | null> {
  const supa = supabaseServer();
  const [{ data: r }, { data: i }, { data: s }] = await Promise.all([
    supa.from('recipes').select('*').eq('id', id).maybeSingle(),
    supa.from('recipe_ingredients').select('*').eq('recipe_id', id).order('position'),
    supa.from('recipe_steps').select('*').eq('recipe_id', id).order('position'),
  ]);
  if (!r) return null;
  return {
    ...(r as Recipe),
    ingredients: (i as RecipeIngredient[]) ?? [],
    steps: (s as RecipeStep[]) ?? [],
  };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const recipe = await fetchRecipe(params.id);
  if (!recipe) return { title: 'Receta · mkxa' };
  const title = `${recipe.title} · mkxa`;
  const description = recipe.notes ?? `Receta compartida desde mkxa: ${recipe.title}.`;
  const image = recipe.image_url ?? recipe.thumbnail_url ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      type: 'article',
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SharedRecipePage({ params }: { params: { id: string } }) {
  const recipe = await fetchRecipe(params.id);
  if (!recipe) notFound();

  const hero = recipe.image_url ?? recipe.thumbnail_url;

  return (
    <article className="flex flex-col gap-5">
      {hero && (
        <div className="overflow-hidden rounded-card bg-ink-soft shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero}
            alt={recipe.title}
            className="aspect-[4/3] w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <header className="flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Receta</p>
        <h1 className="font-sans text-[28px] font-extrabold leading-[1.05] tracking-tightest text-ink">
          {recipe.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-muted">
          {recipe.prep_minutes != null && (
            <span className="inline-flex items-center gap-1">
              <Hourglass size={12} strokeWidth={1.5} aria-hidden />
              {recipe.prep_minutes} min
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users size={12} strokeWidth={1.5} aria-hidden />
            {recipe.servings ?? 2} raciones
          </span>
        </div>
        {recipe.source_url && (
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-action bg-white px-3 py-1.5 text-[12px] font-bold text-ink shadow-action active:scale-95"
          >
            <ExternalLink size={12} strokeWidth={1.75} aria-hidden />
            Ver fuente original
          </a>
        )}
      </header>

      {recipe.notes && (
        <p className="rounded-card bg-white p-4 text-[13px] leading-relaxed text-ink shadow-card">
          {recipe.notes}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-[18px] font-extrabold text-ink">Ingredientes</h2>
        {recipe.ingredients.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No hay ingredientes listados.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 rounded-card bg-white p-4 shadow-card">
            {recipe.ingredients.map((ing, idx) => (
              <li
                key={ing.id ?? `${ing.name}-${idx}`}
                className="flex items-baseline justify-between gap-3 border-b border-ink-soft/30 pb-1.5 last:border-b-0 last:pb-0"
              >
                <span className="text-[14px] text-ink">
                  {ing.name}
                  {ing.optional && (
                    <span className="ml-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      opcional
                    </span>
                  )}
                </span>
                {(ing.quantity != null || ing.unit) && (
                  <span className="shrink-0 text-[12px] font-bold tabular-nums text-ink-muted">
                    {ing.quantity != null ? ing.quantity : ''}
                    {ing.unit ? ` ${ing.unit}` : ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-[18px] font-extrabold text-ink">Pasos</h2>
        {recipe.steps.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Sin pasos detallados.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {recipe.steps.map((step) => (
              <li
                key={step.id ?? step.position}
                className="rounded-card bg-white p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-white">
                    {step.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] leading-relaxed text-ink">{step.body}</p>
                    {step.timer_min != null && (
                      <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Temporizador · {step.timer_min} min
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}
