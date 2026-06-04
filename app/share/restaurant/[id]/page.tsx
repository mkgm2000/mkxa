import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MapPin, Star, ExternalLink } from 'lucide-react';
import { supabaseServer } from '@/lib/supabase/server';
import { cuisineMeta, type Restaurant } from '@/lib/meals/restaurants';

// Public read-only restaurant page. See lib/hooks/use-share.ts for the
// "no token" rationale — RLS is already open project-wide.

async function fetchRestaurant(id: string): Promise<Restaurant | null> {
  const supa = supabaseServer();
  const { data } = await supa
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as Restaurant) ?? null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const r = await fetchRestaurant(params.id);
  if (!r) return { title: 'Restaurante · mkxa' };
  const c = cuisineMeta(r.cuisine);
  const title = `${r.name} · mkxa`;
  const description = r.notes
    ?? `${c.label}${r.location ? ` en ${r.location}` : ''} — compartido desde mkxa.`;
  const image = r.image_url ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      type: 'article',
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function mapsHref(r: Restaurant): string {
  if (r.maps_url) return r.maps_url;
  const q = encodeURIComponent([r.name, r.location].filter(Boolean).join(', '));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export default async function SharedRestaurantPage({ params }: { params: { id: string } }) {
  const r = await fetchRestaurant(params.id);
  if (!r) notFound();
  const c = cuisineMeta(r.cuisine);

  return (
    <article className="flex flex-col gap-5">
      {r.image_url && (
        <div className="overflow-hidden rounded-card bg-ink-soft shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.image_url}
            alt={r.name}
            className="aspect-[16/9] w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <header className="flex items-start gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[28px]"
          style={{ backgroundColor: `${c.color}1A` }}
          aria-hidden
        >
          {c.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.08em]"
            style={{ color: c.color }}
          >
            {c.label}
            {r.price_tier && <span className="ml-2 text-ink-muted">{r.price_tier}</span>}
          </p>
          <h1 className="mt-0.5 font-sans text-[26px] font-extrabold leading-[1.05] tracking-tightest text-ink">
            {r.name}
          </h1>
          {r.rating != null && (
            <div className="mt-1.5 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  strokeWidth={1.5}
                  className={i < (r.rating ?? 0) ? 'text-amber-400' : 'text-ink-soft'}
                  fill={i < (r.rating ?? 0) ? 'currentColor' : 'none'}
                  aria-hidden
                />
              ))}
            </div>
          )}
        </div>
      </header>

      {r.location && (
        <a
          href={mapsHref(r)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-card bg-white p-4 text-[13px] font-bold text-ink shadow-card active:scale-[0.99]"
        >
          <MapPin size={16} strokeWidth={1.75} aria-hidden style={{ color: c.color }} />
          <span className="flex-1 truncate">{r.location}</span>
          <ExternalLink size={14} strokeWidth={1.75} aria-hidden className="text-ink-muted" />
        </a>
      )}

      {r.notes && (
        <section className="rounded-card bg-white p-4 shadow-card">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Notas
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{r.notes}</p>
        </section>
      )}

      {r.website && (
        <a
          href={r.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 rounded-action bg-white px-3 py-1.5 text-[12px] font-bold text-ink shadow-action active:scale-95"
        >
          <ExternalLink size={12} strokeWidth={1.75} aria-hidden />
          Web del sitio
        </a>
      )}
    </article>
  );
}
