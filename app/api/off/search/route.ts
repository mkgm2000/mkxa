// Proxy: /api/off/search?q=<query>
// Hits OpenFoodFacts search v2 in ES (language + country) and returns a
// flat list of products with image, brand, categories. No API key needed
// — proxy exists for CDN caching + a normalised response shape.

import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  generic_name?: string;
  generic_name_es?: string;
  brands?: string;
  image_url?: string;
  image_small_url?: string;
  image_front_url?: string;
  image_front_small_url?: string;
  quantity?: string;
  categories_tags?: string[];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ results: [] });

  // We over-fetch (60) and post-filter so the relevance pass below has
  // enough raw material — OFF's `popularity_key` sort returns generic
  // bestsellers regardless of whether the term matches.
  const params = new URLSearchParams({
    search_terms: q,
    fields: 'code,product_name,product_name_es,generic_name,generic_name_es,brands,image_url,image_small_url,image_front_url,image_front_small_url,quantity,categories_tags',
    page_size: '60',
    lc: 'es',
    cc: 'es',
    sort_by: 'popularity_key',
  });
  const target = `https://world.openfoodfacts.org/api/v2/search?${params.toString()}`;
  const res = await fetch(target, {
    headers: { 'User-Agent': 'mkxa/1.0 (+https://mkxa.vercel.app)' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    return NextResponse.json({ error: 'off upstream failed', status: res.status }, { status: 502 });
  }
  const data = (await res.json()) as { products?: OffProduct[] };

  const tokens = fold(q).split(/\s+/).filter(Boolean);

  const scored = (data.products ?? [])
    .map((p) => {
      const name = (p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || '').trim();
      const image = p.image_small_url || p.image_front_small_url || p.image_url || p.image_front_url || null;
      return {
        barcode: p.code ?? '',
        name,
        brand: (p.brands ?? '').split(',')[0]?.trim() || null,
        quantity: p.quantity ?? null,
        image_url: image,
        categories_tags: p.categories_tags ?? [],
      };
    })
    .filter((r) => r.name && r.image_url && r.barcode)
    .map((r) => {
      const haystack = fold(`${r.name} ${r.brand ?? ''}`);
      // Score: count how many query tokens hit the name/brand. Bonus if
      // the name starts with the first token — that's almost always what
      // the user means ("lechuga" → "Lechuga iceberg", not "Salsa con
      // lechuga"). Categories also get a small bonus.
      let score = 0;
      for (const t of tokens) {
        if (haystack.includes(t)) score += 1;
      }
      if (tokens[0] && fold(r.name).startsWith(tokens[0])) score += 3;
      if (r.categories_tags.some((c) => tokens.every((t) => fold(c).includes(t)))) {
        score += 1;
      }
      return { ...r, _score: score };
    })
    // Drop results that don't match ALL query tokens — eliminates the
    // "popularity_key but unrelated" noise.
    .filter((r) => r._score >= tokens.length);

  scored.sort((a, b) => b._score - a._score);
  const results = scored.slice(0, 20).map((r) => {
    const { _score: _ignored, ...rest } = r;
    void _ignored;
    return rest;
  });

  return NextResponse.json({ results });
}

// Lowercase + strip Spanish accents for fuzzy matching.
function fold(s: string): string {
  return s
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
