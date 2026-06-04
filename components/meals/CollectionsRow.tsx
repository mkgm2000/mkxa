'use client';

import Link from 'next/link';
import { Layers } from 'lucide-react';
import { useCollections } from '@/lib/hooks/use-collections';

// Horizontal scroll of collection cards shown above the per-meal-type
// buckets on /meals?tab=recetas. Tap a card → /meals/collections/[id]
// where MK can browse 1000+ items and promote them one tap at a time.
export function CollectionsRow() {
  const { collections, loading } = useCollections();
  if (loading || collections.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          <Layers size={12} strokeWidth={1.75} aria-hidden />
          Colecciones
        </p>
        <p className="text-[11px] font-bold tabular-nums text-ink-muted">
          {collections.length}
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
        {collections.map((c) => (
          <Link
            key={c.id}
            href={`/meals/collections/${c.id}`}
            className="flex w-[140px] shrink-0 flex-col overflow-hidden rounded-card bg-white shadow-card transition-transform duration-150 active:scale-[0.98]"
          >
            <div className="relative aspect-[4/5] w-full bg-ink-soft">
              {c.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.cover_url}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              ) : null}
              <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                {c.item_count}
              </span>
            </div>
            <div className="p-2">
              <p className="line-clamp-2 text-[12px] font-bold leading-tight text-ink">
                {c.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
