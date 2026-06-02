import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

// POST /api/recipes/tiktok-video  { url: string }
//   → { play_url: string, cover: string | null }
//
// Returns a directly-playable MP4 URL for a TikTok page URL. Uses tikwm's
// public extraction API, which rewrites TikTok's Akamai-protected CDN URLs
// onto tiktokcdn-us.com — a non-Akamai variant that serves the same MP4
// with permissive CORS (Access-Control-Allow-Origin: *), so the browser can
// load it straight into <video src=…> without an additional same-origin
// proxy.

const ReqSchema = z.object({ url: z.string().min(1).max(2048) });

interface TikwmResponse {
  code?: number;
  data?: { play?: string; wmplay?: string; hdplay?: string; cover?: string; origin_cover?: string };
}

async function viaTikwm(url: string): Promise<{ play_url: string; cover: string | null } | null> {
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TikwmResponse;
    if (data.code !== 0 || !data.data) return null;
    const play = data.data.hdplay || data.data.play || data.data.wmplay;
    if (!play) return null;
    return { play_url: play, cover: data.data.origin_cover ?? data.data.cover ?? null };
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
