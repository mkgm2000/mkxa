'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Layers, Loader2, Check, AlertCircle } from 'lucide-react';
import { saveRecipe } from '@/lib/hooks/use-recipes';
import { useAthlete } from '@/lib/athlete-context';
import { MEAL_SLOTS, mealSlotLabel, type MealSlot } from '@/lib/meals/recipes';

interface CollectionItem {
  video_url: string;
  title: string;
  thumbnail: string | null;
  author: string | null;
}

type Step = 'url' | 'loading' | 'preview' | 'saving' | 'done' | 'error';

function isTikTokCollectionUrl(url: string): boolean {
  return /tiktok\.com/i.test(url.trim());
}

// Sheet that walks MK through importing a TikTok "collection" (the curated
// list TikTok lets you share via vm.tiktok.com short link). Resolves the
// collection server-side via yt-dlp, lets the user pick which items to
// save, then bulk-creates one recipe per item.
//
// Instagram has no equivalent public collection concept (saved posts are
// account-private), so we gate the URL check to TikTok.
export function CollectionImport() {
  const router = useRouter();
  const athlete = useAthlete();

  const [step, setStep] = useState<Step>('url');
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [collectionTitle, setCollectionTitle] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [slot, setSlot] = useState<MealSlot>('lunch');
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  async function loadCollection() {
    setError(null);
    if (!isTikTokCollectionUrl(url)) {
      setError('Pega un link de colección de TikTok');
      return;
    }
    setStep('loading');
    try {
      const res = await fetch('/api/extractors/tiktok_collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as { items?: CollectionItem[]; collection_title?: string; error?: string };
      if (!res.ok || data.error || !data.items?.length) {
        setStep('error');
        setError(data.error ?? `extract failed (${res.status})`);
        return;
      }
      setItems(data.items);
      setCollectionTitle(data.collection_title ?? null);
      setSelected(new Set(data.items.map((i) => i.video_url)));
      setStep('preview');
    } catch (e) {
      setStep('error');
      setError(e instanceof Error ? e.message : 'unknown');
    }
  }

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(items.map((i) => i.video_url)));
    else setSelected(new Set());
  }

  function toggleOne(videoUrl: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(videoUrl)) next.delete(videoUrl);
      else next.add(videoUrl);
      return next;
    });
  }

  async function importSelected() {
    if (!athlete || selected.size === 0) return;
    setStep('saving');
    setSavedCount(0);
    let count = 0;
    // Sequential rather than Promise.all so we can update a progress count
    // and don't bombard Supabase with parallel writes on big collections.
    for (const item of items) {
      if (!selected.has(item.video_url)) continue;
      const res = await saveRecipe({
        recipe: {
          title: item.title || '(sin título)',
          source_url: item.video_url,
          source_type: 'tiktok',
          image_url: null,
          prep_minutes: null,
          servings: null,
          tags: item.author ? [`@${item.author.replace(/^@/, '')}`] : [],
          notes: null,
          created_by: athlete,
          meal_type: slot,
          thumbnail_url: item.thumbnail ?? null,
        },
        ingredients: [],
        steps: [],
      });
      if ('id' in res) count += 1;
      setSavedCount(count);
    }
    setStep('done');
    // Tiny delay so MK sees the success state before we navigate away.
    setTimeout(() => router.push('/meals?tab=recetas'), 700);
  }

  return (
    <section className="flex flex-col gap-5 px-5 pb-8">
      <div className="flex flex-col items-center gap-2 pt-4">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-white"
          aria-hidden
        >
          <Layers size={28} strokeWidth={2} />
        </span>
        <h2 className="font-sans text-[24px] font-extrabold tracking-tightest text-ink">
          Importar colección
        </h2>
        <p className="text-center text-[13px] text-ink-muted">
          Pega el link de una colección de TikTok — sacamos cada vídeo como receta.
        </p>
      </div>

      {step === 'url' && (
        <>
          {error && (
            <p className="flex items-center gap-2 rounded-action bg-danger/10 px-3 py-2 text-[12px] text-danger">
              <AlertCircle size={14} strokeWidth={1.75} aria-hidden />
              {error}
            </p>
          )}
          <label htmlFor="col-url" className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Link de la colección
            <input
              id="col-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="tiktok.com/@usuario/collection/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-action border border-ink-soft bg-white px-4 py-3 text-[14px] text-ink placeholder:text-ink-muted/60 focus:border-ink focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={loadCollection}
            disabled={!url.trim()}
            className="rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-40"
          >
            Cargar colección
          </button>
        </>
      )}

      {step === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={28} className="animate-spin text-ink" aria-hidden />
          <p className="text-[13px] text-ink-muted">
            Sacando vídeos de TikTok…
          </p>
        </div>
      )}

      {step === 'preview' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              {collectionTitle ?? 'Colección'}
            </p>
            <button
              type="button"
              onClick={() => toggleAll(selected.size !== items.length)}
              className="text-[12px] font-bold text-ink underline-offset-2"
            >
              {selected.size === items.length ? 'Ninguno' : 'Todos'}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {items.map((it) => {
              const checked = selected.has(it.video_url);
              return (
                <button
                  key={it.video_url}
                  type="button"
                  onClick={() => toggleOne(it.video_url)}
                  className="flex items-center gap-3 rounded-card bg-white p-2.5 text-left shadow-card transition-transform duration-150 active:scale-[0.99]"
                >
                  <div
                    className={clsx(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                      checked ? 'border-ink bg-ink text-white' : 'border-ink-soft bg-white',
                    )}
                  >
                    {checked && <Check size={14} strokeWidth={2.5} aria-hidden />}
                  </div>
                  {it.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.thumbnail}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-action object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-action bg-ink-soft" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-bold text-ink">{it.title}</p>
                    {it.author && (
                      <p className="mt-0.5 text-[11px] text-ink-muted">@{it.author}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Tipo de comida (se aplicará a todas)
            </span>
            <div role="radiogroup" aria-label="Tipo de comida" className="grid grid-cols-5 gap-1 rounded-full bg-white p-1 shadow-action">
              {MEAL_SLOTS.map((s) => {
                const active = s === slot;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSlot(s)}
                    className={clsx(
                      'rounded-full py-2 text-[12px] transition-colors',
                      active ? 'bg-ink text-white font-bold' : 'text-ink-muted font-medium',
                    )}
                  >
                    {mealSlotLabel(s)}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={importSelected}
            disabled={selected.size === 0}
            className="rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-40"
          >
            Importar {selected.size} {selected.size === 1 ? 'receta' : 'recetas'}
          </button>
        </>
      )}

      {step === 'saving' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={28} className="animate-spin text-ink" aria-hidden />
          <p className="text-[13px] text-ink-muted">
            Guardando {savedCount} / {selected.size}…
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white">
            <Check size={28} strokeWidth={2} aria-hidden />
          </span>
          <p className="text-[14px] font-bold text-ink">
            {savedCount} recetas guardadas
          </p>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 rounded-action bg-danger/10 px-3 py-2 text-[12px] text-danger">
            <AlertCircle size={14} strokeWidth={1.75} aria-hidden />
            {error}
          </p>
          <button
            type="button"
            onClick={() => { setStep('url'); setError(null); }}
            className="rounded-action border border-ink-soft bg-white py-3 text-[14px] font-bold text-ink"
          >
            Volver
          </button>
        </div>
      )}
    </section>
  );
}
