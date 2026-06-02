'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

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
  | { kind: 'video';  src: string }
  | { kind: 'images'; images: string[] }
  | { kind: 'error';  msg: string };

interface ExtractResponse {
  kind?: 'video' | 'images';
  play_url?: string;
  images?: string[];
  cover?: string | null;
  error?: string;
}

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
        const data = (await res.json()) as ExtractResponse;
        if (cancelled) return;
        if (data.kind === 'images' && data.images && data.images.length > 0) {
          setState({ kind: 'images', images: data.images });
        } else if (data.play_url) {
          setState({ kind: 'video', src: data.play_url });
        } else {
          setState({ kind: 'error', msg: data.error ?? 'no media' });
        }
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
        {state.kind === 'video' ? (
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
        ) : state.kind === 'images' ? (
          <ImageCarousel images={state.images} poster={poster} />
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

// Photo-slideshow carousel. CSS scroll-snap drives the swipe gesture so we
// don't need a touch library; arrow buttons + dots are belt-and-braces for
// desktop and accessibility.
function ImageCarousel({ images, poster }: { images: string[]; poster: string | null | undefined }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function go(delta: number) {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, index + delta));
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setIndex(next);
  }

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  return (
    <>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt={`Imagen ${i + 1} de ${images.length}`}
            referrerPolicy="no-referrer"
            className="h-full w-full shrink-0 snap-center object-contain"
            loading={i === 0 ? 'eager' : 'lazy'}
            // Falls back to poster if a single slide fails to load.
            onError={(e) => {
              if (poster) (e.currentTarget as HTMLImageElement).src = poster;
            }}
          />
        ))}
      </div>

      {images.length > 1 && (
        <>
          {/* Arrow controls — hidden visually on small screens but present for
              desktop / accessibility. Tap area still works on mobile if the
              user prefers buttons to swiping. */}
          <button
            type="button"
            aria-label="Imagen anterior"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur active:scale-95 sm:flex"
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Imagen siguiente"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur active:scale-95 sm:flex"
          >
            <ChevronRight size={20} strokeWidth={2} aria-hidden />
          </button>

          {/* Position dots */}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className="h-1.5 rounded-full bg-white transition-all"
                style={{
                  width: i === index ? 18 : 6,
                  opacity: i === index ? 1 : 0.55,
                }}
              />
            ))}
          </div>

          {/* Counter pill */}
          <div className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
            {index + 1} / {images.length}
          </div>
        </>
      )}
    </>
  );
}
