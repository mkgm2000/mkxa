import { type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/recipes/tiktok-stream?url=<original-tiktok-page-url>
//
// One-shot streaming proxy. Takes the original tiktok.com page URL, scrapes
// the HTML, extracts playAddr, then immediately fetches the MP4 forwarding
// the Set-Cookie values captured during the HTML fetch. This keeps the
// session/IP context that TikTok's CDN binds the signed URL to — otherwise
// the CDN returns 403.
//
// Forwards the browser's Range header so <video> can seek/buffer.

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

interface TikTokRehydration {
  __DEFAULT_SCOPE__?: {
    'webapp.video-detail'?: { itemInfo?: { itemStruct?: { video?: { playAddr?: string; downloadAddr?: string } } } };
    'webapp.reflow.video.detail'?: { itemInfo?: { itemStruct?: { video?: { playAddr?: string; downloadAddr?: string } } } };
  };
}

function extractPlayAddr(html: string): string | null {
  const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let data: TikTokRehydration;
  try { data = JSON.parse(m[1]) as TikTokRehydration; } catch { return null; }
  const scope = data.__DEFAULT_SCOPE__ ?? {};
  const v =
    scope['webapp.reflow.video.detail']?.itemInfo?.itemStruct?.video ??
    scope['webapp.video-detail']?.itemInfo?.itemStruct?.video;
  return v?.playAddr ?? v?.downloadAddr ?? null;
}

// Extract a Cookie-header-compatible string from a Response. fetch in Node
// returns Set-Cookie joined into one header, which is good enough for our
// short-lived session reuse.
function cookieJar(res: Response): string {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return '';
  // Split on commas that look like cookie boundaries (followed by name=).
  // Node sometimes joins multiple Set-Cookie headers with ", " — split them
  // safely while keeping each cookie's value intact.
  const parts = setCookie.split(/,(?=\s*[A-Za-z0-9_-]+=)/);
  return parts.map((p) => p.split(';')[0].trim()).filter(Boolean).join('; ');
}

export async function GET(req: NextRequest) {
  const pageUrl = req.nextUrl.searchParams.get('url');
  if (!pageUrl) return new Response('missing url', { status: 400 });
  if (!/^https?:\/\/[^\s/]*tiktok\.com\//i.test(pageUrl)) {
    return new Response('not a tiktok url', { status: 400 });
  }

  // 1) Fetch HTML page (capture Set-Cookie).
  let pageRes: Response;
  try {
    pageRes = await fetch(pageUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return new Response('tiktok page fetch failed', { status: 502 });
  }
  if (!pageRes.ok) return new Response(`tiktok page status ${pageRes.status}`, { status: 502 });

  const cookies = cookieJar(pageRes);
  const html = await pageRes.text();
  const mp4Url = extractPlayAddr(html);
  if (!mp4Url) return new Response('no playAddr in page', { status: 502 });

  // 2) Fetch MP4 with cookies + UA + Referer.
  const upstreamHeaders: Record<string, string> = {
    'User-Agent': UA,
    Accept: '*/*',
    Referer: 'https://www.tiktok.com/',
    Origin: 'https://www.tiktok.com',
  };
  if (cookies) upstreamHeaders.Cookie = cookies;
  const range = req.headers.get('range');
  if (range) upstreamHeaders.Range = range;

  let upstream: Response;
  try {
    upstream = await fetch(mp4Url, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return new Response('mp4 fetch failed', { status: 502 });
  }

  const respHeaders = new Headers();
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const v = upstream.headers.get(h);
    if (v) respHeaders.set(h, v);
  }
  if (!respHeaders.has('content-type')) respHeaders.set('content-type', 'video/mp4');
  if (!respHeaders.has('accept-ranges')) respHeaders.set('accept-ranges', 'bytes');
  respHeaders.set('cache-control', 'private, max-age=60');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
