// Domain types for the /media tab. Kept minimal and aligned with the
// Supabase schema in 20260603130000_media_items.sql.

export type MediaType = 'movie' | 'tv';
export type MediaStatus = 'wishlist' | 'seen';
export type Athlete = 'MK' | 'Xabi';

export type ProviderKey = 'netflix' | 'prime' | 'disney' | 'hbo' | 'other';

// Catalog of streaming services we surface in the UI. Order = display order
// in chip rows / filters. Color drives the cinematic widget + chips.
export const PROVIDERS: { key: ProviderKey; label: string; color: string }[] = [
  { key: 'netflix', label: 'Netflix',    color: '#E50914' },
  { key: 'prime',   label: 'Prime Video', color: '#1399FF' },
  { key: 'disney',  label: 'Disney+',    color: '#1E3A8A' },
  { key: 'hbo',     label: 'HBO Max',    color: '#7B2CBF' },
  { key: 'other',   label: 'Otros',      color: '#6B7280' },
];

export function providerMeta(key: string | null | undefined) {
  if (!key) return PROVIDERS[PROVIDERS.length - 1];
  return PROVIDERS.find((p) => p.key === key) ?? PROVIDERS[PROVIDERS.length - 1];
}

export interface MediaItem {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number | null;
  runtime_minutes: number | null;
  providers: ProviderKey[];
  genres: string[];
  status: MediaStatus;
  added_by: Athlete | null;
  rating_mk: number | null;
  rating_xabi: number | null;
  notes: string | null;
  watched_at: string | null;
  created_at: string;
  updated_at: string;
}

// TMDB image CDN. We store only the path (e.g. /xyz.jpg) and pick the size
// at render time so a poster row card can use w342 while the detail page
// uses w780 from the same record.
export function tmdbImage(path: string | null | undefined, size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function releaseYear(date: string | null | undefined): string {
  if (!date || date.length < 4) return '';
  return date.slice(0, 4);
}
