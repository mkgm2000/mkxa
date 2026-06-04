// Proxy: /api/macros/lookup?ean=&name=&category_top=&category_leaf=
// Tries OpenFoodFacts first by EAN (most accurate). Falls back to a
// category-based estimate (always flagged so the UI can warn).

import { NextResponse } from 'next/server';
import { estimateMacros } from '@/lib/meals/macros-estimates';

export const runtime = 'edge';

interface OffNutriments {
  'energy-kcal_100g'?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

async function fetchOff(ean: string): Promise<OffNutriments | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=nutriments`,
      {
        headers: { 'User-Agent': 'mkxa/1.0 (+https://mkxa.vercel.app)' },
        next: { revalidate: 86400 },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { product?: { nutriments?: OffNutriments } };
    return data.product?.nutriments ?? null;
  } catch {
    return null;
  }
}

function round1(n: number | undefined | null): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ean = (url.searchParams.get('ean') ?? '').trim();
  const name = url.searchParams.get('name');
  const categoryTop = url.searchParams.get('category_top');
  const categoryLeaf = url.searchParams.get('category_leaf');

  // OFF first.
  if (ean) {
    const n = await fetchOff(ean);
    const kcal = round1(n?.['energy-kcal_100g']);
    const protein = round1(n?.proteins_100g);
    const carbs = round1(n?.carbohydrates_100g);
    const fat = round1(n?.fat_100g);
    // Accept if at least kcal + one macro is present — partial data is
    // common but kcal alone with everything else 0 is suspicious.
    const macroFieldsPresent = [protein, carbs, fat].filter((v) => v !== null && v > 0).length;
    if (kcal !== null && (kcal > 0 || macroFieldsPresent >= 1)) {
      return NextResponse.json({
        source: 'off',
        kcal_100g: kcal,
        protein_100g: protein ?? 0,
        carbs_100g: carbs ?? 0,
        fat_100g: fat ?? 0,
      });
    }
  }

  // Estimate fallback.
  const est = estimateMacros({
    name,
    categoryTop,
    categoryLeaf,
  });
  return NextResponse.json({
    source: 'estimate',
    ...est,
  });
}
