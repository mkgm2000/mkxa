import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

// Server-side proxy to TikTok's oEmbed endpoint. We hit it from the
// edge (Node runtime) instead of the browser to avoid CORS rejection,
// and to keep the call non-authenticated. oEmbed is rate-limited
// per-IP — if it 404s or 429s we return { error } and the client just
// skips the thumbnail (gracefully shows the emoji fallback).
export const runtime = 'nodejs';

const RequestSchema = z.object({
  url: z.string().min(1).max(2048),
});

interface OEmbedShape {
  thumbnail_url?: string;
  title?: string;
  author_name?: string;
}

export interface TikTokMetaResponse {
  thumbnail_url: string | null;
  title: string | null;
  author_name: string | null;
}

export interface TikTokMetaError {
  error: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<TikTokMetaResponse | TikTokMetaError>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const url = parsed.data.url.trim();
  if (!/tiktok\.com/i.test(url)) {
    return NextResponse.json({ error: 'not a tiktok url' }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
  } catch {
    // Network failure / abort. Return 200 so the client falls back to
    // its emoji card; the upstream is best-effort metadata, not core.
    return NextResponse.json({ error: 'oembed unreachable' });
  }

  // TikTok answers 404 for private/deleted videos. Surface as a soft
  // error (HTTP 200, body has `error`) so the client skips quietly.
  if (!res.ok) {
    return NextResponse.json({ error: 'no metadata' });
  }

  let data: OEmbedShape;
  try {
    data = (await res.json()) as OEmbedShape;
  } catch {
    return NextResponse.json({ error: 'invalid oembed response' });
  }

  return NextResponse.json({
    thumbnail_url: data.thumbnail_url ?? null,
    title: data.title ?? null,
    author_name: data.author_name ?? null,
  });
}
