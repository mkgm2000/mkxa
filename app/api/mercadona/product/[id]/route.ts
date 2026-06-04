// Proxy: /api/mercadona/product/<id>
// Returns product detail incl. EAN + ingredient text. Mercadona doesn't
// expose macros via this endpoint (only allergens + ingredients), so
// callers should use /api/macros/lookup with the EAN we surface here.

import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface RawProduct {
  id?: string;
  ean?: string;
  display_name?: string;
  brand?: string;
  thumbnail?: string;
  photos?: { regular?: string; zoom?: string }[];
  categories?: { id: number; name: string; categories?: RawProduct['categories'] }[];
  nutrition_information?: { ingredients?: string; allergens?: string };
}

function categoryLeaf(cats: RawProduct['categories']): string | null {
  let cursor = cats?.[0];
  while (cursor?.categories && cursor.categories.length > 0) cursor = cursor.categories[0];
  return cursor?.name ?? null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }
  const res = await fetch(`https://tienda.mercadona.es/api/products/${id}/`, {
    headers: { 'User-Agent': 'mkxa/1.0 (+https://mkxa.vercel.app)' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: 'mercadona upstream failed', status: res.status },
      { status: 502 },
    );
  }
  const p = (await res.json()) as RawProduct;
  return NextResponse.json({
    id: p.id,
    ean: p.ean ?? null,
    name: p.display_name ?? '',
    brand: p.brand || null,
    image_url: p.photos?.[0]?.regular ?? p.thumbnail ?? null,
    category_top: p.categories?.[0]?.name ?? null,
    category_leaf: categoryLeaf(p.categories),
    ingredients: p.nutrition_information?.ingredients ?? null,
    allergens: p.nutrition_information?.allergens ?? null,
  });
}
