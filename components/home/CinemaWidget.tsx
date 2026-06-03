'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Film, ArrowUpRight } from 'lucide-react';
import { useMedia } from '@/lib/hooks/use-media';
import { tmdbImage } from '@/lib/media/types';

// Cinematic home widget linking to /media. Layout: black filmstrip card
// with sprocket holes top + bottom, a small stack of poster thumbnails
// fanned to the right, label "Cine y series" + pending count on the left.
// Uses the four most recent wishlist items as the poster fan so the card
// feels alive rather than static.
export function CinemaWidget() {
  const { items, loading } = useMedia();

  const posters = useMemo(() => {
    return items
      .filter((m) => m.status === 'wishlist' && m.poster_path)
      .slice(0, 4)
      .map((m) => ({
        id: m.id,
        url: tmdbImage(m.poster_path, 'w185') ?? '',
        title: m.title,
      }));
  }, [items]);

  const wishCount = useMemo(
    () => items.filter((m) => m.status === 'wishlist').length,
    [items],
  );
  const seenCount = useMemo(
    () => items.filter((m) => m.status === 'seen').length,
    [items],
  );

  return (
    <Link
      href="/media"
      aria-label="Abrir cine y series"
      // The card is the filmstrip "frame": deep ink-black with a warm gold
      // brand accent inside. Sprocket holes are CSS dots top + bottom.
      className="relative mx-5 flex h-32 overflow-hidden rounded-card text-white shadow-card transition-transform duration-150 active:scale-[0.99]"
      style={{
        background: 'radial-gradient(120% 140% at 10% 0%, #2c2c30 0%, #18181b 55%, #0a0a0a 100%)',
      }}
    >
      {/* Sprocket bands top + bottom — small light squares to evoke film */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-3.5 bg-black"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, #fafafa 0 2.5px, transparent 3px)',
          backgroundSize: '14px 100%',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'center',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3.5 bg-black"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, #fafafa 0 2.5px, transparent 3px)',
          backgroundSize: '14px 100%',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'center',
        }}
      />

      {/* Subtle vignette + warm spotlight in the top-left to give depth */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 80% at 0% 0%, rgba(254,210,130,0.15), transparent 60%)',
        }}
      />

      {/* Left column: label + counts */}
      <div className="relative z-10 flex w-3/5 flex-col justify-between px-4 py-5">
        <div className="flex items-center gap-1.5">
          <Film size={12} strokeWidth={1.75} className="text-[#fed282]" aria-hidden />
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#fed282]">
            Cine y series
          </p>
        </div>
        <div className="min-w-0">
          <p className="font-sans text-[20px] font-extrabold leading-tight tracking-tightest">
            {loading
              ? 'Cargando…'
              : wishCount === 0
                ? 'Vamos a ver algo'
                : `${wishCount} por ver`}
          </p>
          <p className="mt-0.5 text-[11px] text-white/65">
            {seenCount > 0 ? `${seenCount} vistas` : 'Toca para añadir'}
          </p>
        </div>
      </div>

      {/* Right column: poster fan. Three or four overlapping mini-posters
          tilted slightly so the card reads as a film reel of upcoming
          watches. Decorative — non-interactive (the whole card is the
          link). */}
      <div className="relative flex w-2/5 items-center justify-center pr-3">
        {posters.length === 0 ? (
          <span
            aria-hidden
            className="flex h-20 w-14 items-center justify-center rounded-[6px] border border-white/15 bg-white/5 text-white/40"
          >
            <Film size={20} strokeWidth={1.5} />
          </span>
        ) : (
          <div className="relative h-20 w-24">
            {posters.map((p, i) => {
              // Stack four posters fanning right with rotation + offset.
              const rot = (i - (posters.length - 1) / 2) * 7;
              const x = i * 10 - 10;
              const z = posters.length - i;
              return (
                <span
                  key={p.id}
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-20 w-14 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[4px] border border-white/10 shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
                  style={{
                    transform: `translate(calc(-50% + ${x}px), -50%) rotate(${rot}deg)`,
                    zIndex: z,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Top-right corner action affordance */}
      <span
        aria-hidden
        className="absolute right-3 top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink"
      >
        <ArrowUpRight size={13} strokeWidth={2} />
      </span>
    </Link>
  );
}
