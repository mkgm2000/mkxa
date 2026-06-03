'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Loader2, AlertCircle, Check } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';
import { useAthlete } from '@/lib/athlete-context';

type Step = 'url' | 'loading' | 'done' | 'error';

interface ServerResponse {
  collection_id?: string | null;
  saved?: boolean;
  items?: unknown[];
  collection_title?: string;
  error?: string;
}

// Sheet that imports a TikTok collection wholesale and is **uninterruptible**
// for the user. The Python extractor handles BOTH the yt-dlp scrape and the
// Supabase insert in a single Vercel function call, so once the network
// request leaves the device we don't need the browser to stay alive: the
// row gets persisted server-side even if the user navigates away or the
// connection drops.
//
// Resilience layers (in order):
//   1. `keepalive: true` so Safari keeps the request going across nav.
//   2. The Python function inserts directly via PostgREST — even if the
//      browser drops, the row appears in DB.
//   3. If our fetch never returns (timeout / abort), we poll Supabase
//      every 5 s for a freshly-created collection that matches our
//      source_url, and we automatically navigate to it.
//   4. `beforeunload` warning so MK gets a confirm prompt before she
//      accidentally closes the tab mid-import.
export function CollectionImport() {
  const router = useRouter();
  const athlete = useAthlete();

  const [step, setStep] = useState<Step>('url');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const trackedUrl = useRef<string | null>(null);
  const importStartedAt = useRef<number | null>(null);

  // Warn before navigating away during a live import.
  useEffect(() => {
    if (step !== 'loading') return;
    function beforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [step]);

  // Resume-poller: if the browser ever loses the fetch, keep checking the
  // DB for a row with our source_url created after we started. When found,
  // jump to the detail page.
  useEffect(() => {
    if (step !== 'loading' || !trackedUrl.current) return;
    let cancelled = false;
    async function poll() {
      const startISO = new Date(importStartedAt.current ?? Date.now()).toISOString();
      const { data, error: pollErr } = await supabaseClient()
        .from('recipe_collections')
        .select('id,item_count,created_at,source_url')
        .eq('source_url', trackedUrl.current ?? '')
        .gt('created_at', startISO)
        .order('created_at', { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (!pollErr && data && data.length > 0) {
        const row = data[0] as { id: string; item_count: number };
        setStep('done');
        setStatusMsg(`Colección con ${row.item_count} vídeos guardada`);
        setTimeout(() => router.push(`/meals/collections/${row.id}`), 600);
      }
    }
    const tick = setInterval(() => { void poll(); }, 5000);
    return () => { cancelled = true; clearInterval(tick); };
  }, [step, router]);

  async function start() {
    setError(null);
    const cleanUrl = url.trim();
    if (!/tiktok\.com/i.test(cleanUrl)) {
      setError('Pega un link de colección de TikTok');
      return;
    }
    trackedUrl.current = cleanUrl;
    importStartedAt.current = Date.now();
    setStep('loading');
    setStatusMsg('Sacando vídeos de TikTok…');

    try {
      const res = await fetch('/api/extractors/tiktok_collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          original_url: cleanUrl,
          created_by: athlete,
        }),
        // Survive tab navigation on mobile Safari / Chrome.
        keepalive: true,
      });
      const data = (await res.json()) as ServerResponse;
      if (!res.ok || data.error) {
        // Don't bail to error yet — the server might have persisted the
        // row anyway. Let the poller find it.
        setStatusMsg('Tardando un poco más de lo normal…');
        return;
      }
      if (data.collection_id) {
        setStep('done');
        setStatusMsg(`Colección con ${(data.items?.length ?? 0)} vídeos guardada`);
        setTimeout(() => router.push(`/meals/collections/${data.collection_id}`), 600);
      } else {
        // Server didn't save — fall back to client-side insert with the
        // payload we already got back, so the data MK just waited for
        // doesn't get thrown away.
        await clientFallbackInsert(data);
      }
    } catch (e) {
      // Network error — the request might still be in flight in another
      // path. Don't show an error: the poller will catch the result if
      // the server completed.
      console.warn('[collection-import] fetch failed, poller still watching', e);
      setStatusMsg('Conexión inestable — esperando confirmación…');
    }
  }

  async function clientFallbackInsert(data: ServerResponse) {
    if (!Array.isArray(data.items) || data.items.length === 0) {
      setStep('error');
      setError('La extracción no devolvió vídeos.');
      return;
    }
    const items = data.items;
    const cover =
      Array.isArray(items) && items.length > 0 && typeof items[0] === 'object'
        ? ((items[0] as { thumbnail?: string | null }).thumbnail ?? null)
        : null;
    const { data: row, error: dbError } = await supabaseClient()
      .from('recipe_collections')
      .insert({
        title: data.collection_title ?? 'Colección sin título',
        source_url: trackedUrl.current ?? url.trim(),
        source_type: 'tiktok',
        items,
        cover_url: cover,
        created_by: athlete,
      })
      .select('id')
      .single();
    if (dbError || !row) {
      setStep('error');
      setError(dbError?.message ?? 'no se pudo guardar');
      return;
    }
    setStep('done');
    setStatusMsg(`Colección con ${items.length} vídeos guardada`);
    setTimeout(() => router.push(`/meals/collections/${(row as { id: string }).id}`), 600);
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
            onClick={start}
            disabled={!url.trim()}
            className="rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-40"
          >
            Cargar y guardar
          </button>
          <p className="text-center text-[11px] text-ink-muted">
            Las colecciones grandes (1000+) tardan ~1 min. Si cierras la app,
            la importación sigue en el servidor — al volver verás la colección.
          </p>
        </>
      )}

      {step === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Loader2 size={28} className="animate-spin text-ink" aria-hidden />
          <p className="text-[13px] font-medium text-ink">{statusMsg}</p>
          <p className="max-w-[280px] text-[11px] text-ink-muted">
            No cierres esta pantalla. Si pierdes conexión, la importación se
            recupera sola — el servidor termina de guardar la colección.
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white">
            <Check size={28} strokeWidth={2} aria-hidden />
          </span>
          <p className="text-[14px] font-bold text-ink">{statusMsg}</p>
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
