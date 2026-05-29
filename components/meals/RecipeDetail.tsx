import Link from 'next/link';
import { Hourglass, Flame } from 'lucide-react';
import type { RecipeWithDetails } from '@/lib/meals/recipes';
import { aisleLabel } from '@/lib/meals/recipes';

export function RecipeDetail({ recipe }: { recipe: RecipeWithDetails }) {
  return (
    <article className="flex flex-col gap-5 px-5">
      {recipe.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.image_url} alt="" className="w-full rounded-card object-cover" />
      )}

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

      <Link
        href={`/meals/cook/${recipe.id}`}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-action bg-ink py-4 text-[14px] font-bold text-white"
      >
        <Flame size={18} strokeWidth={1.5} aria-hidden /> Cocinar
      </Link>
    </article>
  );
}
