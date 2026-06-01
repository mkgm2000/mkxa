'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, Play } from 'lucide-react';
import clsx from 'clsx';
import { RecipeReview, type ExtractedRecipe } from '@/components/meals/RecipeReview';
import { saveRecipe } from '@/lib/hooks/use-recipes';
import { useAthlete } from '@/lib/athlete-context';
import { RECIPE_TEMPLATES, type RecipeTemplate } from '@/lib/meals/recipe-templates';
import { MEAL_SLOTS, mealSlotLabel, type MealSlot } from '@/lib/meals/recipes';

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

type Mode = 'gallery' | 'tiktok' | 'template';

function isTikTokUrl(url: string): boolean {
  return /tiktok\.com/i.test(url.trim());
}

export default function NewRecipePage() {
  const router = useRouter();
  const athlete = useAthlete();
  const [mode, setMode] = useState<Mode>('gallery');
  const [picked, setPicked] = useState<ExtractedRecipe | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo TikTok form state.
  const [ttUrl, setTtUrl] = useState('');
  const [ttTitle, setTtTitle] = useState('');
  const [ttSlot, setTtSlot] = useState<MealSlot>('lunch');
  const [ttError, setTtError] = useState<string | null>(null);

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

  async function saveTikTokOnly() {
    setTtError(null);
    if (!athlete) return;
    const url = ttUrl.trim();
    let title = ttTitle.trim();
    // Title is optional now — if MK leaves it blank we'll try to
    // backfill it from the oEmbed `title` field (which TikTok returns
    // as `@username video description`). If oEmbed also fails we
    // gate-keep with a friendly message.
    if (!url || !isTikTokUrl(url)) { setTtError('El link debe ser de tiktok.com'); return; }
    setBusy(true);

    // Best-effort metadata fetch — never blocks the save. Timeouts and
    // 4xx/5xx all collapse into "no thumbnail" with the recipe still
    // persisted so MK doesn't lose the link.
    let thumbnail_url: string | null = null;
    let author_name: string | null = null;
    try {
      const metaRes = await fetch('/api/recipes/tiktok-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (metaRes.ok) {
        const meta = (await metaRes.json()) as {
          thumbnail_url?: string | null;
          title?: string | null;
          author_name?: string | null;
          error?: string;
        };
        if (!meta.error) {
          thumbnail_url = meta.thumbnail_url ?? null;
          author_name = meta.author_name ?? null;
          if (!title && meta.title) title = meta.title;
        }
      }
    } catch {
      // Swallow — proceed without metadata.
    }

    if (!title) {
      setBusy(false);
      setTtError('Pon un título (no pude leerlo del video).');
      return;
    }

    const res = await saveRecipe({
      recipe: {
        title,
        source_url: url,
        source_type: 'tiktok',
        image_url: null,
        prep_minutes: null,
        servings: null,
        tags: author_name ? [`@${author_name.replace(/^@/, '')}`] : [],
        notes: null,
        created_by: athlete,
        meal_type: ttSlot,
        thumbnail_url,
      },
      ingredients: [],
      steps: [],
    });
    setBusy(false);
    if ('id' in res) router.push('/meals?tab=recetas');
    else setTtError(res.error);
  }

  function back() {
    if (mode !== 'gallery') {
      setMode('gallery');
      setPicked(null);
      return;
    }
    router.back();
  }

  const title =
    mode === 'tiktok' ? 'Solo TikTok' :
    picked ? 'Nueva receta' :
    'Elige una plantilla';

  return (
    <main className="flex flex-col gap-5 px-1 pt-4">
      <header className="flex items-center justify-between px-4">
        <button
          type="button"
          onClick={back}
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </button>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">
          {title}
        </h1>
        <span aria-hidden className="h-10 w-10" />
      </header>

      {error && <p className="px-5 text-[12px] text-danger">{error}</p>}

      {mode === 'gallery' && !picked && (
        <section className="flex flex-col gap-4 px-4 pb-6">
          {/* Prominent Solo TikTok quick-create */}
          <button
            type="button"
            onClick={() => setMode('tiktok')}
            className="flex items-center gap-4 rounded-card bg-ink p-4 text-left text-white shadow-card transition-transform duration-150 active:scale-[0.98]"
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15"
              aria-hidden
            >
              <Play size={22} strokeWidth={2} fill="currentColor" className="ml-0.5" />
            </span>
            <span className="flex flex-col">
              <span className="font-sans text-[16px] font-extrabold leading-tight">Solo TikTok</span>
              <span className="text-[12px] text-white/70">Para cuando solo necesitas el video</span>
            </span>
          </button>

          <p className="px-1 text-[13px] text-ink-muted">
            ¿Quieres ingredientes y pasos? Empieza con una plantilla y cambia lo que necesites.
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
            className="rounded-card bg-ink/90 py-3 text-center text-[13px] font-bold text-white"
          >
            O importar desde TikTok / web
          </Link>
        </section>
      )}

      {mode === 'tiktok' && (
        <section className="flex flex-col gap-5 px-5 pb-8">
          <div className="flex flex-col items-center gap-2 pt-4">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-white"
              aria-hidden
            >
              <Play size={32} strokeWidth={2} fill="currentColor" className="ml-1" />
            </span>
            <h2 className="font-sans text-[24px] font-extrabold tracking-tightest text-ink">
              Solo TikTok
            </h2>
            <p className="text-center text-[13px] text-ink-muted">
              Para cuando solo necesitas el video
            </p>
          </div>

          {ttError && (
            <p className="rounded-action bg-danger/10 px-3 py-2 text-[12px] text-danger">
              {ttError}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="tt-url" className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Pega el link de TikTok
            </label>
            <input
              id="tt-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.tiktok.com/..."
              value={ttUrl}
              onChange={(e) => setTtUrl(e.target.value)}
              className="rounded-action border border-ink-soft bg-white px-4 py-3 text-[14px] text-ink placeholder:text-ink-muted/60 focus:border-ink focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="tt-title" className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Título
            </label>
            <input
              id="tt-title"
              type="text"
              autoComplete="off"
              placeholder="Bowl de avena con plátano"
              value={ttTitle}
              onChange={(e) => setTtTitle(e.target.value)}
              className="rounded-action border border-ink-soft bg-white px-4 py-3 text-[14px] text-ink placeholder:text-ink-muted/60 focus:border-ink focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Tipo de comida
            </span>
            <div role="radiogroup" aria-label="Tipo de comida" className="grid grid-cols-4 gap-1 rounded-full bg-white p-1 shadow-action">
              {MEAL_SLOTS.map((slot) => {
                const active = slot === ttSlot;
                return (
                  <button
                    key={slot}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTtSlot(slot)}
                    className={clsx(
                      'rounded-full py-2 text-[12px] transition-colors',
                      active ? 'bg-ink text-white font-bold' : 'text-ink-muted font-medium',
                    )}
                  >
                    {mealSlotLabel(slot)}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={saveTikTokOnly}
            disabled={busy}
            className="mt-2 rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </section>
      )}

      {mode === 'gallery' && picked && athlete && (
        <RecipeReview initial={picked} athlete={athlete} busy={busy} onSave={save} />
      )}
    </main>
  );
}
