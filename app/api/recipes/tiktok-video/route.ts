import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

// POST /api/recipes/tiktok-video  { url: string }
//   → { kind: 'video',  play_url: string, cover: string | null }
//   → { kind: 'images', images:  string[], cover: string | null }
//
// TikTok posts come in two shapes: regular videos and photo-slideshows.
// We hit tikwm.com which normalises both shapes. For videos it returns
// `data.play` (a non-Akamai mirror that browsers can play directly). For
// slideshows it returns `data.images` — an array of full-resolution image
// URLs. We auto-detect by checking which field is populated.

const ReqSchema = z.object({ url: z.string().min(1).max(2048) });

interface TikwmResponse {
  code?: number;
  data?: {
    play?: string;
    wmplay?: string;
    hdplay?: string;
    cover?: string;
    origin_cover?: string;
    images?: string[];
  };
}

type ExtractResult =
  | { kind: 'video';  play_url: string; cover: string | null }
  | { kind: 'images'; images: string[]; cover: string | null };

async function viaTikwm(url: string): Promise<ExtractResult | null> {
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TikwmResponse;
    if (data.code !== 0 || !data.data) return null;
    const cover = data.data.origin_cover ?? data.data.cover ?? null;

    // Slideshow first: if there are any images, treat the post as a
    // photo carousel even if `play` is set (TikTok adds the music track
    // as `play` for slideshows and that'd be misleading to embed as video).
    if (Array.isArray(data.data.images) && data.data.images.length > 0) {
      return { kind: 'images', images: data.data.images, cover };
    }
    const play = data.data.hdplay || data.data.play || data.data.wmplay;
    if (play) return { kind: 'video', play_url: play, cover };
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const parsed = ReqSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 });

  const url = parsed.data.url.trim();
  if (!/tiktok\.com/i.test(url)) {
    return NextResponse.json({ error: 'not a tiktok url' }, { status: 400 });
  }

  const result = await viaTikwm(url);
  if (!result) return NextResponse.json({ error: 'extraction failed' }, { status: 502 });
  return NextResponse.json(result);
}
