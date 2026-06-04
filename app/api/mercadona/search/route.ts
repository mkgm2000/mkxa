// Proxy: /api/mercadona/search?q=<query>
// Hits the Mercadona Algolia index (products_prod_mad1_es) using the
// search-only API key visible in their web app. The key is intentionally
// public — Mercadona ships it in their SPA bundle — but we still proxy
// it to (1) keep our outbound user-agent consistent, (2) reshape the
// result, (3) CDN-cache the hot queries.

import { NextResponse } from 'next/server';

export const runtime = 'edge';

const ALGOLIA = {
  appId: '7UZJKL1DJ0',
  searchKey: '9d8f2e39e90df472b4f2e559a116fe17',
  index: 'products_prod_mad1_es',
};

interface AlgoliaHit {
  id: string;
  slug?: string;
  display_name?: string;
  brand?: string;
  packaging?: string;
  thumbnail?: string;
  share_url?: string;
  categories?: { id: number; name: string; categories?: AlgoliaHit['categories'] }[];
  price_instructions?: {
    unit_price?: string;
    reference_price?: string;
    reference_format?: string;
    size_format?: string;
  };
}

// Flatten the nested category tree into a top-level + leaf string used by
// the macros estimator. Mercadona's tree is always at most 3 deep.
function categoryPath(hit: AlgoliaHit): { top: string | null; leaf: string | null } {
  const node: AlgoliaHit['categories'] = hit.categories;
  let top: string | null = null;
  let leaf: string | null = null;
  if (node && node.length > 0) {
    top = node[0].name ?? null;
    let cursor = node[0];
    while (cursor.categories && cursor.categories.length > 0) {
      cursor = cursor.categories[0];
    }
    leaf = cursor.name ?? null;
  }
  return { top, leaf };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ results: [] });

  const body = { query: q, hitsPerPage: 20 };
  const res = await fetch(
    `https://${ALGOLIA.appId.toLowerCase()}-dsn.algolia.net/1/indexes/${ALGOLIA.index}/query`,
    {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': ALGOLIA.appId,
        'X-Algolia-API-Key': ALGOLIA.searchKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      next: { revalidate: 3600 },
    },
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: 'mercadona upstream failed', status: res.status },
      { status: 502 },
    );
  }
  const data = (await res.json()) as { hits?: AlgoliaHit[] };
  const results = (data.hits ?? []).map((h) => {
    const cat = categoryPath(h);
    return {
      id: h.id,
      name: h.display_name ?? '',
      brand: h.brand || null,
      packaging: h.packaging || null,
      image_url: h.thumbnail ?? null,
      share_url: h.share_url ?? null,
      unit_price: h.price_instructions?.unit_price ?? null,
      reference_price: h.price_instructions?.reference_price ?? null,
      reference_format: h.price_instructions?.reference_format ?? null,
      category_top: cat.top,
      category_leaf: cat.leaf,
    };
  });

  return NextResponse.json({ results });
}
