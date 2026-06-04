import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Star } from 'lucide-react';
import { supabaseServer } from '@/lib/supabase/server';
import {
  providerMeta,
  releaseYear,
  tmdbImage,
  type MediaItem,
} from '@/lib/media/types';

// Public read-only media (movie / tv) page. See lib/hooks/use-share.ts
// for the no-token rationale.

async function fetchMedia(id: string): Promise<MediaItem | null> {
  const supa = supabaseServer();
  const { data } = await supa
    .from('media_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as MediaItem) ?? null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const m = await fetchMedia(params.id);
  if (!m) return { title: 'Media · mkxa' };
  const kind = m.media_type === 'tv' ? 'Serie' : 'Película';
  const title = `${m.title} · mkxa`;
  const description = m.overview
    ?? `${kind}${releaseYear(m.release_date) ? ` (${releaseYear(m.release_date)})` : ''} — compartido desde mkxa.`;
  // Prefer the backdrop for OG images (wider aspect) and fall back to the
  // poster path. Large size — the share preview cards on Slack/iMessage
  // re-encode to whatever they need.
  const ogImg = tmdbImage(m.backdrop_path ?? m.poster_path, 'w780') ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImg ? [{ url: ogImg }] : undefined,
      type: 'video.other',
    },
    twitter: {
      card: ogImg ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImg ? [ogImg] : undefined,
    },
  };
}

export default async function SharedMediaPage({ params }: { params: { id: string } }) {
  const m = await fetchMedia(params.id);
  if (!m) notFound();

  const poster = tmdbImage(m.poster_path, 'w500');
  const backdrop = tmdbImage(m.backdrop_path ?? m.poster_path, 'w780');
  const kind = m.media_type === 'tv' ? 'Serie' : 'Película';

  return (
    <article className="flex flex-col gap-5">
      {backdrop && (
        <div className="relative overflow-hidden rounded-card bg-ink-soft shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backdrop}
            alt={m.title}
            className="aspect-[16/9] w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        </div>
      )}

      <header className="flex items-start gap-4">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={m.title}
            className="h-32 w-24 shrink-0 rounded-action object-cover shadow-action"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            {kind}
            {releaseYear(m.release_date) ? ` · ${releaseYear(m.release_date)}` : ''}
            {m.runtime_minutes ? ` · ${m.runtime_minutes} min` : ''}
          </p>
          <h1 className="mt-1 font-sans text-[24px] font-extrabold leading-[1.05] tracking-tightest text-ink">
            {m.title}
          </h1>
          {m.vote_average !== null && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-bold text-ink-muted">
              <Star size={12} strokeWidth={2} fill="currentColor" className="text-amber-400" aria-hidden />
              {m.vote_average.toFixed(1)}
            </p>
          )}
        </div>
      </header>

      {m.providers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {m.providers.map((p) => {
            const meta = providerMeta(p);
            return (
              <span
                key={p}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: meta.color }}
              >
                {meta.label}
              </span>
            );
          })}
        </div>
      )}

      {m.overview && (
        <p className="rounded-card bg-white p-4 text-[13px] leading-relaxed text-ink shadow-card">
          {m.overview}
        </p>
      )}

      {m.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {m.genres.map((g) => (
            <span key={g} className="rounded-full bg-ink-soft px-2 py-0.5 text-[10px] font-bold text-ink-muted">
              {g}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
