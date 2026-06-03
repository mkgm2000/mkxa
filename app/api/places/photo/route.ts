// Proxy: /api/places/photo?name=<photoName>&w=400
// Streams a Google Places photo so we can serve it without exposing the
// API key in img src attributes. Heavy caching at the CDN — photos
// rarely change for a given place.

export const runtime = 'edge';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = (url.searchParams.get('name') ?? '').trim();
  const w = Number(url.searchParams.get('w') ?? '400');
  if (!name) return new Response('missing name', { status: 400 });

  const key = (process.env.GOOGLE_PLACES_API_KEY ?? '').trim();
  if (!key) return new Response('places key missing', { status: 500 });

  const maxWidthPx = Math.max(40, Math.min(1600, Math.floor(w)));
  const target = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidthPx}&key=${key}&skipHttpRedirect=true`;
  const res = await fetch(target);
  if (!res.ok) return new Response('upstream', { status: 502 });
  const data = (await res.json()) as { photoUri?: string };
  if (!data.photoUri) return new Response('no photoUri', { status: 502 });

  const img = await fetch(data.photoUri);
  if (!img.ok) return new Response('photo fetch', { status: 502 });
  return new Response(img.body, {
    status: 200,
    headers: {
      'Content-Type': img.headers.get('Content-Type') ?? 'image/jpeg',
      // Photos are stable per (place, size). Cache 7d at the edge.
      'Cache-Control': 'public, max-age=604800, s-maxage=604800, immutable',
    },
  });
}
