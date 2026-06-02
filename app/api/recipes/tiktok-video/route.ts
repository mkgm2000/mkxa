import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

// POST /api/recipes/tiktok-video  { url: string }
//   → { play_url: string, cover: string | null }
//
// Validates the URL is a TikTok URL and hands back a same-origin proxy
// URL that the <video> tag can stream. The proxy (/tiktok-stream) does
// the actual HTML scrape + MP4 fetch in a single in-process session so
// the CDN signed URL stays bound to the same context.
//
// Also returns the cover URL (poster) so the player can show it while
// the MP4 loads instead of a black square.

const ReqSchema = z.object({ url: z.string().min(1).max(2048) });

interface TikTokRehydration {
  __DEFAULT_SCOPE__?: {
    'webapp.video-detail'?: { itemInfo?: { itemStruct?: { video?: { cover?: string; originCover?: string } } } };
    'webapp.reflow.video.detail'?: { itemInfo?: { itemStruct?: { video?: { cover?: string; originCover?: string } } } };
  };
}

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function extractCover(html: string): string | null {
  const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let data: TikTokRehydration;
  try { data = JSON.parse(m[1]) as TikTokRehydration; } catch { return null; }
  const scope = data.__DEFAULT_SCOPE__ ?? {};
  const v =
    scope['webapp.reflow.video.detail']?.itemInfo?.itemStruct?.video ??
    scope['webapp.video-detail']?.itemInfo?.itemStruct?.video;
  return v?.cover ?? v?.originCover ?? null;
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

  // Cover lookup is best-effort. If we can't get the page right now, the
  // stream endpoint will still try when the <video> tag connects.
  let cover: string | null = null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const html = await res.text();
      cover = extractCover(html);
    }
  } catch {
    // ignore — non-fatal
  }

  const playUrl = `/api/recipes/tiktok-stream?url=${encodeURIComponent(url)}`;
  return NextResponse.json({ play_url: playUrl, cover });
}
