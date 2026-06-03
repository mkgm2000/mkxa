// Proxy: /api/tmdb/search?q=<query> → TMDB multi-search filtered to
// movie + tv, plus a flat list of items the client can render directly.
// Lives server-side so the TMDB key never ships to the browser.

import { NextResponse } from 'next/server';

export const runtime = 'edge';

type RawResult = {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ results: [] });

  // Strip whitespace — env values added via `echo ... | vercel env add`
  // carry a trailing newline which TMDB rejects as invalid auth.
  const key = (process.env.TMDB_API_KEY ?? '').trim();
  if (!key) {
    return NextResponse.json({ error: 'TMDB key missing' }, { status: 500 });
  }

  const params = new URLSearchParams({
    api_key: key,
    query: q,
    language: 'es-ES',
    include_adult: 'false',
    page: '1',
  });
  const tmdbUrl = `https://api.themoviedb.org/3/search/multi?${params.toString()}`;
  const res = await fetch(tmdbUrl, { next: { revalidate: 60 } });
  if (!res.ok) {
    return NextResponse.json({ error: 'tmdb upstream failed', status: res.status }, { status: 502 });
  }
  const data = (await res.json()) as { results?: RawResult[] };
  const results = (data.results ?? [])
    .filter((r): r is RawResult & { media_type: 'movie' | 'tv' } =>
      r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => ({
      tmdb_id: r.id,
      media_type: r.media_type,
      title: (r.title ?? r.name ?? '').trim(),
      original_title: (r.original_title ?? r.original_name ?? null) || null,
      overview: r.overview ?? null,
      poster_path: r.poster_path ?? null,
      backdrop_path: r.backdrop_path ?? null,
      release_date: r.release_date ?? r.first_air_date ?? null,
      vote_average: typeof r.vote_average === 'number' ? Math.round(r.vote_average * 10) / 10 : null,
    }))
    .filter((r) => r.title && r.poster_path);

  return NextResponse.json({ results });
}
