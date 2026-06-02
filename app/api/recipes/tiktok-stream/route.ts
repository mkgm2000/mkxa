import { type NextRequest } from 'next/server';

export const runtime = 'nodejs';
// Streaming proxy must not be cached at the edge — URLs are signed/expire,
// and Range responses are per-client.
export const dynamic = 'force-dynamic';

// GET /api/recipes/tiktok-stream?u=<encoded-mp4-url>
//
// TikTok's CDN serves signed MP4 URLs that 403 unless the request carries
// a TikTok-looking User-Agent and Referer. They also require Range support
// for the browser's <video> tag to seek/buffer. We forward the client's
// Range header, set the headers TikTok expects, and stream the body back
// chunk-by-chunk (no buffering) so the start of the video plays as soon as
// the first bytes arrive.

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const ALLOWED_HOSTS = [
  /\.tiktok\.com$/i,
  /\.tiktokcdn\.com$/i,
  /\.tiktokcdn-us\.com$/i,
  /\.tiktokv\.com$/i,
  /\.tiktokv\.us$/i,
];

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u');
  if (!u) return new Response('missing u', { status: 400 });

  let target: URL;
  try { target = new URL(u); }
  catch { return new Response('invalid url', { status: 400 }); }

  if (!ALLOWED_HOSTS.some((re) => re.test(target.hostname))) {
    return new Response('host not allowed', { status: 400 });
  }

  const upstreamHeaders: Record<string, string> = {
    'User-Agent': UA,
    Accept: '*/*',
    Referer: 'https://www.tiktok.com/',
    Origin: 'https://www.tiktok.com',
  };
  const range = req.headers.get('range');
  if (range) upstreamHeaders.Range = range;

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return new Response('upstream fetch failed', { status: 502 });
  }

  const respHeaders = new Headers();
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const v = upstream.headers.get(h);
    if (v) respHeaders.set(h, v);
  }
  if (!respHeaders.has('content-type')) respHeaders.set('content-type', 'video/mp4');
  if (!respHeaders.has('accept-ranges')) respHeaders.set('accept-ranges', 'bytes');
  respHeaders.set('cache-control', 'private, max-age=300');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
