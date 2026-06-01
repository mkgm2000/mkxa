import { Hourglass } from 'lucide-react';
import {
  tagColor,
  recipeFallbackEmoji,
  recipeFallbackGradient,
  type Recipe,
} from '@/lib/meals/recipes';

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const emoji = recipeFallbackEmoji(recipe.title);
  const gradient = recipeFallbackGradient(recipe.title);
  return (
    <article className="overflow-hidden rounded-card bg-white shadow-card">
      <div
        className={`relative aspect-[4/3] w-full bg-gradient-to-br ${gradient}`}
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
            className="flex h-full w-full items-center justify-center text-[56px] leading-none"
            aria-hidden
          >
            {emoji}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 font-sans text-[14px] font-extrabold leading-tight text-ink">
          {recipe.title}
        </h3>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-ink-muted">
          {recipe.prep_minutes != null && (
            <>
              <Hourglass size={11} strokeWidth={1.5} aria-hidden />
              <span>{recipe.prep_minutes} min</span>
              <span>·</span>
            </>
          )}
          <span>{recipe.servings ?? 2} raciones</span>
        </div>
        {recipe.tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {recipe.tags.slice(0, 3).map((t) => (
              <li key={t} className="flex items-center gap-1 text-[11px] text-ink-muted">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tagColor(t) }} aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
