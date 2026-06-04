'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Loader2, AlertCircle, Check } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';
import { useAthlete } from '@/lib/athlete-context';
import { CollectionImportProgress } from './CollectionImportProgress';

type Step = 'url' | 'tracking' | 'done' | 'error';

// Triggers the GitHub Actions workflow that runs yt-dlp + writes items.
// Once dispatched, the collection row already exists in DB (status
// 'queued'). The user sees a live progressive loader sourced from the
// row's import_progress field. Closing the tab is safe — the workflow
// keeps running and the row gets to 'completed' regardless.
export function CollectionImport() {
  const router = useRouter();
  const athlete = useAthlete();

  const [step, setStep] = useState<Step>('url');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const isClosingRef = useRef(false);

  // Warn before navigating away during tracking — but only if the user
  // still expects to see the result here. Once we navigate to the detail
  // page we suppress the warning.
  useEffect(() => {
    if (step !== 'tracking') return;
    function beforeUnload(e: BeforeUnloadEvent) {
      if (isClosingRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [step]);

  async function start() {
    setError(null);
    const cleanUrl = url.trim();
    if (!/tiktok\.com/i.test(cleanUrl)) {
      setError('Pega un link de colección de TikTok');
      return;
    }

    try {
      const res = await fetch('/api/extractors/tiktok-collection-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          mode: 'new',
          athlete,
        }),
      });
      const data = (await res.json()) as { collection_id?: string; error?: string; detail?: string };
      if (!res.ok || !data.collection_id) {
        // 503 with friendly message if the env var GH_PAT isn't set yet.
        setStep('error');
        setError(data.error === 'GH_PAT env missing'
          ? 'Falta configurar el token de GitHub. Ver instrucciones en mkxa/profile.'
          : data.error ?? 'No se pudo arrancar la importación');
        return;
      }
      setCollectionId(data.collection_id);
      setStep('tracking');
    } catch (e) {
      console.warn('[collection-import] trigger failed', e);
      setStep('error');
      setError('Sin conexión');
    }
  }

  // Fallback poller — if the page is the source of truth (still here when
  // workflow completes), navigate to detail.
  useEffect(() => {
    if (step !== 'tracking' || !collectionId) return;
    let cancelled = false;
    async function tick() {
      const { data } = await supabaseClient()
        .from('recipe_collections')
        .select('id,import_status,item_count')
        .eq('id', collectionId)
        .maybeSingle();
      if (cancelled || !data) return;
      const row = data as { id: string; import_status: string; item_count: number };
      if (row.import_status === 'completed') {
        isClosingRef.current = true;
        setStep('done');
        setTimeout(() => router.push(`/meals/collections/${row.id}`), 600);
      } else if (row.import_status === 'failed') {
        setStep('error');
        setError('La importación falló — mira el detalle de la colección para reintentar.');
      }
    }
    const t = setInterval(() => { void tick(); }, 2500);
    return () => { cancelled = true; clearInterval(t); };
  }, [step, collectionId, router]);

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
          Pega el link de una colección de TikTok. La extracción corre en GitHub
          Actions y los vídeos se guardan en bloques de 100 — ves el progreso en
          vivo.
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
            Arrancar importación
          </button>
          <p className="text-center text-[11px] text-ink-muted">
            Las grandes (1000+) tardan ~2 min. Si cierras la app, la importación
            sigue en GitHub y al volver verás la colección lista.
          </p>
        </>
      )}

      {step === 'tracking' && collectionId && (
        <CollectionImportProgress collectionId={collectionId} />
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white">
            <Check size={28} strokeWidth={2} aria-hidden />
          </span>
          <p className="text-[14px] font-bold text-ink">¡Listo! Abriendo la colección…</p>
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

      {step === 'tracking' && (
        <p className="text-center text-[11px] text-ink-muted">
          Puedes cerrar esta pantalla: la importación corre en GitHub. Cuando
          vuelvas la colección estará lista o avanzada.
        </p>
      )}

      {/* unused but keeps the file consistent with original imports */}
      <span style={{ display: 'none' }} aria-hidden>
        <Loader2 size={1} />
      </span>
    </section>
  );
}
