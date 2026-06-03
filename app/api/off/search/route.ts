// Proxy: /api/off/search?q=<query>
// Hits search.openfoodfacts.org (search-a-licious) which actually
// ranks by relevance to the query — the legacy /api/v2/search endpoint
// returns popularity-sorted results regardless of the search term, so
// searching "lechuga" surfaced oats. No API key needed.

import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface OffHit {
  code?: string;
  product_name?: string;
  brands?: string[];
  image_url?: string;
  quantity?: string;
  categories_tags?: string[];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ results: [] });

  const params = new URLSearchParams({
    q,
    langs: 'es,en',
    countries_tags_en: 'spain',
    fields: 'code,product_name,brands,image_url,quantity,categories_tags',
    page_size: '20',
  });
  const target = `https://search.openfoodfacts.org/search?${params.toString()}`;
  const res = await fetch(target, {
    headers: { 'User-Agent': 'mkxa/1.0 (+https://mkxa.vercel.app)' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    // Fallback: drop the country filter — for niche queries the Spain
    // restriction may zero out results.
    const fallback = new URLSearchParams({
      q,
      langs: 'es,en',
      fields: 'code,product_name,brands,image_url,quantity,categories_tags',
      page_size: '20',
    });
    const retry = await fetch(`https://search.openfoodfacts.org/search?${fallback.toString()}`, {
      headers: { 'User-Agent': 'mkxa/1.0 (+https://mkxa.vercel.app)' },
      next: { revalidate: 3600 },
    });
    if (!retry.ok) {
      return NextResponse.json({ error: 'off upstream failed', status: retry.status }, { status: 502 });
    }
    return NextResponse.json({ results: shape(await retry.json()) });
  }
  return NextResponse.json({ results: shape(await res.json()) });
}

function shape(payload: unknown): unknown {
  const hits = (payload as { hits?: OffHit[] }).hits ?? [];
  return hits
    .map((p) => {
      const name = (p.product_name ?? '').trim();
      const image = p.image_url ?? null;
      const brand = Array.isArray(p.brands) ? p.brands[0] ?? null : null;
      return {
        barcode: p.code ?? '',
        name,
        brand,
        quantity: p.quantity ?? null,
        image_url: image,
        categories_tags: p.categories_tags ?? [],
      };
    })
    .filter((r) => r.name && r.image_url && r.barcode);
}
