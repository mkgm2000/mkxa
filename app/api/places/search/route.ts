// Proxy: /api/places/search?q=<text>
// Hits Places API (New) `places:searchText` biased to Madrid, restaurant
// types only, language=es. Returns a flat list the client can render.
// The Google key never leaves the server.

import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface PlacesPhoto { name: string }
interface PlacesResult {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  priceLevel?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  types?: string[];
  photos?: PlacesPhoto[];
  googleMapsUri?: string;
  websiteUri?: string;
}

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.priceLevel',
  'places.rating',
  'places.userRatingCount',
  'places.primaryType',
  'places.types',
  'places.photos',
  'places.googleMapsUri',
  'places.websiteUri',
].join(',');

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ results: [] });

  // Trim in case the env var was added with a trailing newline.
  const key = (process.env.GOOGLE_PLACES_API_KEY ?? '').trim();
  if (!key) return NextResponse.json({ error: 'places key missing' }, { status: 500 });

  // Madrid centroid + ~10km radius. Bias only — searches still work for
  // venues outside the bias, just deprioritised. Lets MK + Xabi search a
  // chiringuito on a trip without us forcing Madrid.
  const body = {
    textQuery: q,
    languageCode: 'es',
    regionCode: 'ES',
    includedType: 'restaurant',
    locationBias: {
      circle: {
        center: { latitude: 40.4168, longitude: -3.7038 },
        radius: 12000,
      },
    },
    maxResultCount: 20,
  };

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: 'places upstream failed', status: res.status, detail }, { status: 502 });
  }
  const data = (await res.json()) as { places?: PlacesResult[] };
  const results = (data.places ?? []).map((p) => ({
    place_id: p.id ?? '',
    name: p.displayName?.text ?? '',
    address: p.shortFormattedAddress ?? p.formattedAddress ?? null,
    price_level: p.priceLevel ?? null,
    rating: typeof p.rating === 'number' ? Math.round(p.rating * 10) / 10 : null,
    rating_count: p.userRatingCount ?? null,
    primary_type: p.primaryType ?? null,
    types: p.types ?? [],
    photo_name: p.photos?.[0]?.name ?? null,
    maps_url: p.googleMapsUri ?? null,
    website: p.websiteUri ?? null,
  })).filter((r) => r.place_id && r.name);

  return NextResponse.json({ results });
}
