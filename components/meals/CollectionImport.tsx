'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Loader2, AlertCircle, Check } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';
import { useAthlete } from '@/lib/athlete-context';

interface CollectionItem {
  video_url: string;
  title: string;
  thumbnail: string | null;
  author: string | null;
}

type Step = 'url' | 'loading' | 'saving' | 'done' | 'error';

// Sheet that imports a TikTok collection wholesale. The collection is
// stored as a single row in `recipe_collections` with the items as
// compressed JSONB — MK can then browse it on its own page and promote
// individual videos to real recipes one tap at a time. Saving 1000 rows
// up-front would clobber the recipes list and isn't what she wants.
export function CollectionImport() {
  const router = useRouter();
  const athlete = useAthlete();

  const [step, setStep] = useState<Step>('url');
  const [url, setUrl] = useState('');
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function loadAndSave() {
    setError(null);
    if (!/tiktok\.com/i.test(url.trim())) {
      setError('Pega un link de colección de TikTok');
      return;
    }
    setStep('loading');
    let items: CollectionItem[] = [];
    let collectionTitle: string | null = null;
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
      items = data.items;
      collectionTitle = data.collection_title ?? 'Colección sin título';
    } catch (e) {
      setStep('error');
      setError(e instanceof Error ? e.message : 'unknown');
      return;
    }

    setCount(items.length);
    setStep('saving');

    // Single insert with items as JSONB. cover_url is the first item's
    // thumbnail so the collection card on the recipes tab has something
    // to show without us round-tripping per item.
    const { data: row, error: dbError } = await supabaseClient()
      .from('recipe_collections')
      .insert({
        title: collectionTitle,
        source_url: url.trim(),
        source_type: 'tiktok',
        items,
        cover_url: items[0]?.thumbnail ?? null,
        created_by: athlete,
      })
      .select('id')
      .single();
    if (dbError || !row) {
      setStep('error');
      setError(dbError?.message ?? 'no se pudo guardar la colección');
      return;
    }

    setStep('done');
    // Brief success state, then navigate to the collection detail page.
    setTimeout(() => router.push(`/meals/collections/${row.id}`), 600);
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
          Pega el link de una colección de TikTok. Guardamos todos los vídeos
          en una colección comprimida para que los pases a recetas uno a uno.
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
            onClick={loadAndSave}
            disabled={!url.trim()}
            className="rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-40"
          >
            Cargar y guardar
          </button>
          <p className="text-center text-[11px] text-ink-muted">
            Las colecciones grandes (1000+ vídeos) pueden tardar un minuto.
          </p>
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

      {step === 'saving' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={28} className="animate-spin text-ink" aria-hidden />
          <p className="text-[13px] text-ink-muted">
            Guardando colección con {count} vídeos…
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white">
            <Check size={28} strokeWidth={2} aria-hidden />
          </span>
          <p className="text-[14px] font-bold text-ink">
            Colección con {count} vídeos guardada
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
