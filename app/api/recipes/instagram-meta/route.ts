import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

// POST /api/recipes/instagram-meta  { url: string }
//   → { thumbnail_url, title, author_name }
//
// Instagram strips video URLs from unauthenticated page loads but it still
// leaves the og:image and og:title meta tags. We scrape those server-side
// to get the cover thumbnail for the recipe card. Playback itself uses the
// official IG embed iframe in MediaEmbed.
export const runtime = 'nodejs';

const ReqSchema = z.object({ url: z.string().min(1).max(2048) });

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function metaContent(html: string, property: string): string | null {
  // Property OR name flavor — IG uses property=, but the helper handles both.
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
    'i',
  );
  const m = html.match(re);
  if (m) return decodeHtml(m[1]);
  // Try reversed attribute order (content before property).
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
    'i',
  );
  const m2 = html.match(re2);
  return m2 ? decodeHtml(m2[1]) : null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"');
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const parsed = ReqSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 });

  const url = parsed.data.url.trim();
  if (!/instagram\.com/i.test(url)) {
    return NextResponse.json({ error: 'not an instagram url' }, { status: 400 });
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
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ thumbnail_url: null, title: null, author_name: null, error: 'instagram unreachable' });
  }
  if (!res.ok) {
    return NextResponse.json({ thumbnail_url: null, title: null, author_name: null, error: `instagram status ${res.status}` });
  }

  const html = await res.text();
  const thumbnail_url = metaContent(html, 'og:image');
  // IG og:title is "<author> on Instagram: "<caption>"" — split.
  const rawTitle = metaContent(html, 'og:title');
  let title: string | null = null;
  let author_name: string | null = null;
  if (rawTitle) {
    const m = rawTitle.match(/^(.+?)\s+on Instagram[:\s]+"?(.+?)"?$/i);
    if (m) {
      author_name = m[1].trim();
      title = m[2].trim();
    } else {
      title = rawTitle.trim();
    }
  }

  return NextResponse.json({
    thumbnail_url: thumbnail_url ?? null,
    title: title ?? null,
    author_name: author_name ?? null,
  });
}
