import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

// POST /api/recipes/tiktok-meta  { url: string }
//   → { thumbnail_url, title, author_name }
//
// Strategy: hit tikwm first because (a) for photo-slideshows it returns
// `images[]` and we want `images[0]` as the recipe cover, and (b) it also
// covers regular video posts via `origin_cover`. Fall back to TikTok's
// oEmbed only if tikwm doesn't yield a usable image — oEmbed 404s for
// slideshow posts, which is the bug that left "Ideas de snack Mercadona"
// without a cover.
export const runtime = 'nodejs';

const RequestSchema = z.object({
  url: z.string().min(1).max(2048),
});

export interface TikTokMetaResponse {
  thumbnail_url: string | null;
  title: string | null;
  author_name: string | null;
}

interface TikwmResponse {
  code?: number;
  data?: {
    title?: string;
    cover?: string;
    origin_cover?: string;
    images?: string[];
    author?: { unique_id?: string; nickname?: string };
  };
}

interface OEmbedShape {
  thumbnail_url?: string;
  title?: string;
  author_name?: string;
}

async function viaTikwm(url: string): Promise<TikTokMetaResponse | null> {
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TikwmResponse;
    if (data.code !== 0 || !data.data) return null;
    const d = data.data;
    const thumb =
      (Array.isArray(d.images) && d.images.length > 0 ? d.images[0] : null) ||
      d.origin_cover ||
      d.cover ||
      null;
    if (!thumb) return null;
    return {
      thumbnail_url: thumb,
      title: d.title ?? null,
      author_name: d.author?.unique_id || d.author?.nickname || null,
    };
  } catch {
    return null;
  }
}

async function viaOembed(url: string): Promise<TikTokMetaResponse | null> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OEmbedShape;
    return {
      thumbnail_url: data.thumbnail_url ?? null,
      title: data.title ?? null,
      author_name: data.author_name ?? null,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 });

  const url = parsed.data.url.trim();
  if (!/tiktok\.com/i.test(url)) {
    return NextResponse.json({ error: 'not a tiktok url' }, { status: 400 });
  }

  const tikwm = await viaTikwm(url);
  if (tikwm?.thumbnail_url) {
    return NextResponse.json(tikwm);
  }

  const oembed = await viaOembed(url);
  if (oembed?.thumbnail_url) {
    // Merge what tikwm got us (it may have title/author even when image
    // came from oembed) so we lose as little as possible.
    return NextResponse.json({
      thumbnail_url: oembed.thumbnail_url,
      title: tikwm?.title ?? oembed.title,
      author_name: tikwm?.author_name ?? oembed.author_name,
    });
  }

  return NextResponse.json({ thumbnail_url: null, title: null, author_name: null, error: 'no metadata' });
}
