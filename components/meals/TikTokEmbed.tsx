'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';

interface TikTokEmbedProps {
  url: string | null;
  /** Optional poster (e.g. recipe.thumbnail_url) shown while the MP4 loads. */
  poster?: string | null;
}

// Extract a numeric video id from a canonical TikTok URL.
// Returns null if URL is a shortlink (vm.tiktok.com / tiktok.com/t/) or non-TikTok.
export function extractTikTokVideoId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (m && m[1]) return m[1];
  return null;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; src: string }
  | { kind: 'error'; msg: string };

export function TikTokEmbed({ url, poster }: TikTokEmbedProps) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  useEffect(() => {
    if (!url) { setState({ kind: 'idle' }); return; }
    let cancelled = false;
    setState({ kind: 'loading' });
    void (async () => {
      try {
        const res = await fetch('/api/recipes/tiktok-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) {
          if (!cancelled) setState({ kind: 'error', msg: `extract failed (${res.status})` });
          return;
        }
        const data = (await res.json()) as { play_url?: string; error?: string };
        if (cancelled) return;
        if (!data.play_url) {
          setState({ kind: 'error', msg: data.error ?? 'no play_url' });
          return;
        }
        setState({ kind: 'ready', src: data.play_url });
      } catch (e) {
        if (!cancelled) setState({ kind: 'error', msg: e instanceof Error ? e.message : 'unknown' });
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (!url) {
    return (
      <div className="mx-auto flex w-full max-w-[420px] items-center justify-center rounded-card bg-ink-soft px-4 py-8 text-center text-[13px] text-ink-muted">
        Sin video TikTok asociado
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto flex w-full max-w-[420px] items-center justify-center gap-2 rounded-card bg-white px-4 py-6 text-[14px] font-bold text-ink shadow-card"
      >
        <ExternalLink size={16} strokeWidth={1.5} aria-hidden />
        Abrir en TikTok
      </a>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-card bg-black shadow-card">
      <div className="relative aspect-[9/16] w-full max-h-[70vh]">
        {state.kind === 'ready' ? (
          <video
            // eslint-disable-next-line jsx-a11y/media-has-caption
            src={state.src}
            poster={poster ?? undefined}
            controls
            playsInline
            autoPlay
            muted
            loop
            className="absolute inset-0 h-full w-full rounded-card object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-70"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <Loader2 size={28} className="relative animate-spin text-white" aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}
