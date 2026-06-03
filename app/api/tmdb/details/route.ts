// Proxy: /api/tmdb/details?id=<tmdb_id>&type=movie|tv
// Returns runtime, genres, and the ES watch providers (Netflix / Prime /
// Disney+ / HBO Max → our 4 canonical chips). Called when the user opens
// an item from the search results so we can store the providers + extras
// in our DB and not re-query TMDB at list time.

import { NextResponse } from 'next/server';

export const runtime = 'edge';

const PROVIDER_MAP: Record<number, 'netflix' | 'prime' | 'disney' | 'hbo' | 'other'> = {
  8:    'netflix',  // Netflix
  9:    'prime',    // Amazon Prime Video
  119:  'prime',    // Amazon Video
  10:   'prime',    // Amazon Video (legacy)
  337:  'disney',   // Disney Plus
  1899: 'hbo',      // Max (was HBO Max)
  384:  'hbo',      // HBO Max legacy id
};

function mapProvider(id: number): 'netflix' | 'prime' | 'disney' | 'hbo' | 'other' {
  return PROVIDER_MAP[id] ?? 'other';
}

interface FlatrateProvider { provider_id: number; provider_name: string }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const type = url.searchParams.get('type');
  if (!id || (type !== 'movie' && type !== 'tv')) {
    return NextResponse.json({ error: 'bad params' }, { status: 400 });
  }
  // Same trim as /search — env from `echo | vercel env add` has \n suffix.
  const key = (process.env.TMDB_API_KEY ?? '').trim();
  if (!key) return NextResponse.json({ error: 'TMDB key missing' }, { status: 500 });

  const base = `https://api.themoviedb.org/3/${type}/${id}`;
  const detailsUrl = `${base}?api_key=${key}&language=es-ES`;
  const providersUrl = `${base}/watch/providers?api_key=${key}`;

  const [detRes, provRes] = await Promise.all([
    fetch(detailsUrl, { next: { revalidate: 3600 } }),
    fetch(providersUrl, { next: { revalidate: 3600 } }),
  ]);
  if (!detRes.ok) return NextResponse.json({ error: 'tmdb details failed' }, { status: 502 });
  const det = (await detRes.json()) as {
    runtime?: number;
    episode_run_time?: number[];
    genres?: { id: number; name: string }[];
  };
  const providers: ('netflix' | 'prime' | 'disney' | 'hbo' | 'other')[] = [];
  if (provRes.ok) {
    const pd = (await provRes.json()) as {
      results?: Record<string, { flatrate?: FlatrateProvider[] }>;
    };
    const es = pd.results?.ES;
    if (es?.flatrate) {
      const seen = new Set<string>();
      for (const p of es.flatrate) {
        const mapped = mapProvider(p.provider_id);
        if (!seen.has(mapped)) { providers.push(mapped); seen.add(mapped); }
      }
    }
  }

  const runtime_minutes = typeof det.runtime === 'number'
    ? det.runtime
    : Array.isArray(det.episode_run_time) && det.episode_run_time.length > 0
      ? det.episode_run_time[0]
      : null;
  const genres = (det.genres ?? []).map((g) => g.name);

  return NextResponse.json({
    runtime_minutes,
    genres,
    providers,
  });
}
