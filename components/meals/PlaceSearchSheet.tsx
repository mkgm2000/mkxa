'use client';

import { useEffect, useState } from 'react';
import { Search, X, MapPin, Star } from 'lucide-react';
import {
  cuisineFromPlacesTypes,
  priceTierFromGoogle,
  type CuisineValue,
  type PriceTier,
} from '@/lib/meals/restaurants';

export interface PlacePick {
  name: string;
  cuisine: CuisineValue | null;
  location: string | null;
  price_tier: PriceTier | null;
  image_url: string | null;       // /api/places/photo?name=...
  google_place_id: string;
  maps_url: string | null;
  website: string | null;
}

interface SearchResult {
  place_id: string;
  name: string;
  address: string | null;
  price_level: string | null;
  rating: number | null;
  rating_count: number | null;
  primary_type: string | null;
  types: string[];
  photo_name: string | null;
  maps_url: string | null;
  website: string | null;
}

interface Props {
  onClose: () => void;
  onPick: (p: PlacePick) => void;
}

// Bottom sheet that wraps /api/places/search. User taps a card → we
// translate Google fields to our domain (cuisine, price_tier) and call
// onPick so the parent (RestaurantForm) prefills its fields.
export function PlaceSearchSheet({ onClose, onPick }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function k(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setError(null); return; }
    const handle = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const r = await fetch(`/api/places/search?q=${encodeURIComponent(q.trim())}`);
        if (!r.ok) {
          setError('Búsqueda no disponible');
          setResults([]);
          return;
        }
        const data = (await r.json()) as { results?: SearchResult[] };
        setResults(data.results ?? []);
      } catch {
        setError('Sin conexión');
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [q]);

  function pick(r: SearchResult) {
    const cuisine = cuisineFromPlacesTypes(
      r.primary_type ? [r.primary_type, ...r.types] : r.types,
    );
    onPick({
      name: r.name,
      cuisine,
      location: r.address,
      price_tier: priceTierFromGoogle(r.price_level),
      image_url: r.photo_name ? `/api/places/photo?name=${encodeURIComponent(r.photo_name)}&w=600` : null,
      google_place_id: r.place_id,
      maps_url: r.maps_url,
      website: r.website,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar restaurante"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:h-[80vh] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-ink-soft/40 px-4 py-3">
          <div>
            <h3 className="font-sans text-[17px] font-extrabold text-ink">Buscar en Google</h3>
            <p className="mt-0.5 text-[10px] text-ink-muted">
              Restaurantes en Madrid · pre-rellena el formulario
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-action active:scale-95"
          >
            <X size={18} strokeWidth={1.75} className="text-ink" aria-hidden />
          </button>
        </div>

        <div className="border-b border-ink-soft/40 px-4 py-3">
          <div className="relative">
            <Search
              size={16}
              strokeWidth={1.75}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <input
              autoFocus
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Sushi Madrid, ramen Chueca, tapas Latina…"
              className="w-full rounded-full bg-white px-10 py-2.5 text-[14px] text-ink shadow-action placeholder:text-ink-muted focus:outline-none"
            />
            {q && (
              <button
                type="button"
                aria-label="Limpiar"
                onClick={() => setQ('')}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-ink-soft text-ink active:scale-95"
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <p className="px-4 py-6 text-center text-[12px] text-danger">{error}</p>}
          {searching && <p className="px-4 py-6 text-center text-[12px] text-ink-muted">Buscando…</p>}
          {!searching && q && results.length === 0 && !error && (
            <p className="px-4 py-6 text-center text-[12px] text-ink-muted">Sin resultados.</p>
          )}
          {!searching && !q && (
            <p className="px-4 py-6 text-center text-[12px] text-ink-muted">
              Escribe el nombre del restaurante o el tipo de cocina.
            </p>
          )}
          <ul className="divide-y divide-ink-soft/40">
            {results.map((r) => {
              const photo = r.photo_name
                ? `/api/places/photo?name=${encodeURIComponent(r.photo_name)}&w=240`
                : null;
              return (
                <li key={r.place_id}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-ink-soft/20"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-action object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-action bg-ink-soft text-ink-muted">
                        <MapPin size={20} strokeWidth={1.5} aria-hidden />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13px] font-bold text-ink">{r.name}</p>
                      {r.address && (
                        <p className="line-clamp-1 text-[11px] text-ink-muted">{r.address}</p>
                      )}
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-muted">
                        {r.rating !== null && (
                          <span className="flex items-center gap-0.5">
                            <Star size={10} strokeWidth={2} fill="currentColor" className="text-amber-400" aria-hidden />
                            {r.rating.toFixed(1)}
                            {r.rating_count ? <span className="text-ink-muted/70"> · {r.rating_count}</span> : null}
                          </span>
                        )}
                        {r.price_level && (
                          <span className="font-bold">{priceLevelEuros(r.price_level)}</span>
                        )}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function priceLevelEuros(level: string): string {
  switch (level) {
    case 'PRICE_LEVEL_INEXPENSIVE':    return '€';
    case 'PRICE_LEVEL_MODERATE':       return '€€';
    case 'PRICE_LEVEL_EXPENSIVE':      return '€€€';
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '€€€€';
    default: return '';
  }
}
