'use client';

import { useEffect } from 'react';
import { Hourglass, Play } from 'lucide-react';
import {
  tagColor,
  recipeFallbackEmoji,
  recipeFallbackGradient,
  mealSlotLabel,
  type Recipe,
} from '@/lib/meals/recipes';
import { setRecipeThumbnail } from '@/lib/hooks/use-recipes';

// Module-local guard so we only hit /api/recipes/tiktok-meta once per
// recipe per page-load. Without this, every render of the Recetas grid
// would re-fire the fetch for the same id — bad UX and a free way to
// get rate-limited by TikTok.
const tiktokMetaLookupAttempted = new Set<string>();

async function backfillVideoThumbnail(recipe: Recipe): Promise<void> {
  if (!recipe.source_url) return;
  if (tiktokMetaLookupAttempted.has(recipe.id)) return;
  tiktokMetaLookupAttempted.add(recipe.id);
  const endpoint =
    recipe.source_type === 'instagram'
      ? '/api/recipes/instagram-meta'
      : '/api/recipes/tiktok-meta';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: recipe.source_url }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { thumbnail_url?: string | null; error?: string };
    if (data.error || !data.thumbnail_url) return;
    // Only PATCH the DB when the endpoint actually returned something
    // different — avoids a row update on every page load for TikTok video
    // posts whose oembed thumbnail already matches.
    if (data.thumbnail_url === recipe.thumbnail_url) return;
    await setRecipeThumbnail(recipe.id, data.thumbnail_url);
    // Parent (useRecipes) refetches on next focus; no manual refresh here.
  } catch {
    // Silent — the next mount can retry after a page navigation.
  }
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const isVideo = recipe.source_type === 'tiktok' || recipe.source_type === 'instagram';
  const hasThumb = Boolean(recipe.thumbnail_url);

  // Lazy revalidation: for every video recipe, fire the meta endpoint once
  // per page lifetime. The Set dedups; the endpoint itself short-circuits
  // (no DB write) when the result matches the existing thumbnail. This
  // self-heals old TikTok slideshow recipes that were saved with the
  // oembed video frame before slideshow detection landed.
  useEffect(() => {
    if (!isVideo) return;
    void backfillVideoThumbnail(recipe);
  }, [isVideo, recipe]);

  if (isVideo && hasThumb && recipe.thumbnail_url) {
    return <TikTokPosterCard recipe={recipe} />;
  }

  return <DefaultCard recipe={recipe} />;
}

function TikTokPosterCard({ recipe }: { recipe: Recipe }) {
  return (
    <article className="group relative overflow-hidden rounded-card bg-ink shadow-card">
      <div className="relative aspect-[9/16] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={recipe.thumbnail_url ?? ''}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
        {/* Center play indicator — mimics a TikTok feed item that hasn't started playing yet. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm"
            style={{ filter: 'drop-shadow(0 2px 6px rgb(0 0 0 / 0.35))' }}
            aria-hidden
          >
            <Play size={28} strokeWidth={2} fill="currentColor" className="ml-1 text-white" />
          </span>
        </div>
        {/* Meal-type tag, top-right. */}
        {recipe.meal_type && (
          <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            {mealSlotLabel(recipe.meal_type)}
          </span>
        )}
        {/* Bottom gradient + title. */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <h3 className="line-clamp-2 font-sans text-[14px] font-bold leading-tight text-white">
            {recipe.title}
          </h3>
        </div>
      </div>
    </article>
  );
}

function DefaultCard({ recipe }: { recipe: Recipe }) {
  const emoji = recipeFallbackEmoji(recipe.title);
  const gradient = recipeFallbackGradient(recipe.title);
  return (
    <article className="overflow-hidden rounded-card bg-white shadow-card">
      <div className={`relative aspect-[4/3] w-full bg-gradient-to-br ${gradient}`}>
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
