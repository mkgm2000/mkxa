'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { TikTokEmbed } from './TikTokEmbed';

interface MediaEmbedProps {
  url: string | null;
  poster?: string | null;
  /** Optional explicit source — overrides URL host detection. */
  sourceType?: 'tiktok' | 'instagram' | string | null;
}

export function detectSource(url: string | null): 'tiktok' | 'instagram' | null {
  if (!url) return null;
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'instagram';
  return null;
}

export function MediaEmbed({ url, poster, sourceType }: MediaEmbedProps) {
  const source =
    sourceType === 'tiktok' || sourceType === 'instagram'
      ? sourceType
      : detectSource(url);

  if (source === 'instagram') {
    return <InstagramEmbed url={url} poster={poster} />;
  }
  // Default to TikTok pipeline (also handles slideshow auto-detect).
  return <TikTokEmbed url={url} poster={poster} />;
}

type IgState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; src: string }
  | { kind: 'error'; msg: string };

interface ExtractResponse {
  play_url?: string;
  cover?: string | null;
  error?: string;
}

// Instagram path: call our Python yt-dlp extractor, get a direct MP4 URL
// off scontent.cdninstagram.com (CORS: *), drop it into a <video> tag.
function InstagramEmbed({ url, poster }: { url: string | null; poster?: string | null }) {
  const [state, setState] = useState<IgState>({ kind: 'idle' });

  useEffect(() => {
    if (!url) { setState({ kind: 'idle' }); return; }
    let cancelled = false;
    setState({ kind: 'loading' });
    void (async () => {
      try {
        const res = await fetch('/api/extractors/instagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) {
          if (!cancelled) setState({ kind: 'error', msg: `extract failed (${res.status})` });
          return;
        }
        const data = (await res.json()) as ExtractResponse;
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
      <div className="mx-auto flex w-full max-w-[460px] items-center justify-center rounded-card bg-ink-soft px-4 py-8 text-center text-[13px] text-ink-muted">
        Sin video Instagram asociado
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto flex w-full max-w-[460px] items-center justify-center gap-2 rounded-card bg-white px-4 py-6 text-[14px] font-bold text-ink shadow-card"
      >
        <ExternalLink size={16} strokeWidth={1.5} aria-hidden />
        Abrir en Instagram
      </a>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl bg-black shadow-card">
      <div className="relative aspect-[9/16] w-full max-h-[75vh]">
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
            className="absolute inset-0 h-full w-full object-contain"
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
