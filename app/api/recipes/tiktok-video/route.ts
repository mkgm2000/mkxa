import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

// POST /api/recipes/tiktok-video  { url: string }
//   → { play_url: string }      where play_url is a same-origin proxy URL
//                               that streams the MP4 with proper Range support.
//
// TikTok playAddr URLs are signed AND require the same UA/cookies as the
// page fetch — they 403 if hit directly from a browser. So we extract the
// signed URL server-side and hand back a same-origin endpoint that proxies
// the stream with the correct headers. The MP4 URL expires after ~hours,
// so we don't cache the proxy URL across requests.

const ReqSchema = z.object({ url: z.string().min(1).max(2048) });

interface TikTokRehydrationVideo {
  playAddr?: string;
  downloadAddr?: string;
  cover?: string;
  duration?: number;
}

interface TikTokItemStruct {
  video?: TikTokRehydrationVideo;
}

interface TikTokRehydration {
  __DEFAULT_SCOPE__?: {
    'webapp.video-detail'?: {
      itemInfo?: { itemStruct?: TikTokItemStruct };
    };
    'webapp.reflow.video.detail'?: {
      itemInfo?: { itemStruct?: TikTokItemStruct };
    };
  };
}

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function extractRehydration(html: string): TikTokRehydration | null {
  const m = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as TikTokRehydration;
  } catch {
    return null;
  }
}

function extractVideo(data: TikTokRehydration): TikTokRehydrationVideo | null {
  const scope = data.__DEFAULT_SCOPE__ ?? {};
  return (
    scope['webapp.reflow.video.detail']?.itemInfo?.itemStruct?.video ??
    scope['webapp.video-detail']?.itemInfo?.itemStruct?.video ??
    null
  );
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

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json({ error: 'tiktok unreachable' }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: `tiktok status ${res.status}` }, { status: 502 });
  }

  const html = await res.text();
  const data = extractRehydration(html);
  if (!data) return NextResponse.json({ error: 'no rehydration data' }, { status: 502 });

  const video = extractVideo(data);
  const mp4 = video?.playAddr || video?.downloadAddr;
  if (!mp4) return NextResponse.json({ error: 'no playAddr in rehydration' }, { status: 502 });

  // Hand back same-origin proxy URL. The browser <video> tag hits this
  // and the proxy forwards the request to TikTok with the correct headers.
  const proxied = `/api/recipes/tiktok-stream?u=${encodeURIComponent(mp4)}`;
  return NextResponse.json({ play_url: proxied, cover: video?.cover ?? null });
}
