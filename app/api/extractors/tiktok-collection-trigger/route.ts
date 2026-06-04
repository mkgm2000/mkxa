// Proxy: POST /api/extractors/tiktok-collection-trigger
//   { url: string, mode?: 'new'|'refresh', collection_id?: string, athlete?: 'MK'|'Xabi' }
//
// Resolves a short link (vm.tiktok.com/...), creates or finds the
// recipe_collections row (status='queued'), and fires the GitHub
// workflow that runs yt-dlp + writes items. Returns the collection_id
// so the client can poll for progress.

import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface TriggerBody {
  url?: string;
  mode?: 'new' | 'refresh';
  collection_id?: string;
  athlete?: 'MK' | 'Xabi';
}

function clean(s: string | undefined | null): string {
  return (s ?? '').trim();
}

async function resolveShortUrl(url: string): Promise<string> {
  const lower = url.toLowerCase();
  if (!lower.includes('vm.tiktok.com') && !lower.includes('/t/')) return url;
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15',
      },
    });
    return res.url || url;
  } catch {
    return url;
  }
}

async function supabasePatch(base: string, key: string, table: string, idEq: string, payload: unknown) {
  return fetch(`${base}/rest/v1/${table}?id=eq.${idEq}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });
}

async function supabaseInsert(base: string, key: string, table: string, payload: unknown) {
  return fetch(`${base}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });
}

async function supabaseSelectOne(base: string, key: string, table: string, query: string) {
  const r = await fetch(`${base}/rest/v1/${table}?${query}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function POST(req: Request) {
  let body: TriggerBody;
  try {
    body = (await req.json()) as TriggerBody;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const rawUrl = clean(body.url);
  // Strip control characters that creep in from TikTok's share sheet.
  const url = rawUrl.split('').filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127).join('');
  if (!url || !/tiktok\.com/i.test(url)) {
    return NextResponse.json({ error: 'not a tiktok url' }, { status: 400 });
  }

  const supaUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, '');
  const supaKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const ghPat = clean(process.env.GH_PAT);
  const ghOwner = clean(process.env.GH_OWNER) || 'mkgm2000';
  const ghRepo = clean(process.env.GH_REPO) || 'mkxa';
  if (!supaUrl || !supaKey) {
    return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  }
  if (!ghPat) {
    return NextResponse.json({ error: 'GH_PAT env missing' }, { status: 503 });
  }

  // Resolve vm.tiktok.com short links so the script gets the canonical URL.
  const resolved = await resolveShortUrl(url);

  const mode: 'new' | 'refresh' = body.mode === 'refresh' ? 'refresh' : 'new';
  let collectionId = clean(body.collection_id);

  if (mode === 'refresh') {
    if (!collectionId) {
      // Try to find by source_url.
      const existing = await supabaseSelectOne(
        supaUrl, supaKey, 'recipe_collections',
        `source_url=eq.${encodeURIComponent(resolved)}&select=id`,
      );
      collectionId = existing?.id ?? '';
    }
    if (!collectionId) {
      return NextResponse.json({ error: 'no collection to refresh' }, { status: 404 });
    }
    // Reset status to queued.
    await supabasePatch(supaUrl, supaKey, 'recipe_collections', collectionId, {
      import_status: 'queued',
      import_progress: { phase: 'queued', processed: 0, total: 0, message: 'En cola…' },
      import_started_at: new Date().toISOString(),
    });
  } else {
    // Brand-new collection row — placeholder title until yt-dlp returns one.
    const insertRes = await supabaseInsert(supaUrl, supaKey, 'recipe_collections', {
      title: 'Colección TikTok (cargando…)',
      source_url: resolved,
      source_type: 'tiktok',
      items: [],
      item_count: 0,
      cover_url: null,
      created_by: body.athlete === 'MK' || body.athlete === 'Xabi' ? body.athlete : null,
      import_status: 'queued',
      import_progress: { phase: 'queued', processed: 0, total: 0, message: 'En cola…' },
      import_started_at: new Date().toISOString(),
    });
    if (!insertRes.ok) {
      const text = await insertRes.text();
      return NextResponse.json({ error: 'insert failed', detail: text }, { status: 502 });
    }
    const rows = (await insertRes.json()) as { id: string }[];
    collectionId = rows[0]?.id ?? '';
    if (!collectionId) {
      return NextResponse.json({ error: 'insert returned no id' }, { status: 502 });
    }
  }

  // Dispatch the GitHub workflow.
  const ghRes = await fetch(
    `https://api.github.com/repos/${ghOwner}/${ghRepo}/actions/workflows/tiktok-collection-import.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${ghPat}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          collection_id: collectionId,
          url: resolved,
          mode,
          athlete: body.athlete ?? '',
        },
      }),
    },
  );
  if (!ghRes.ok) {
    const text = await ghRes.text();
    await supabasePatch(supaUrl, supaKey, 'recipe_collections', collectionId, {
      import_status: 'failed',
      import_progress: { phase: 'failed', processed: 0, total: 0, message: `GitHub: ${text.slice(0, 120)}` },
    });
    return NextResponse.json({ error: 'github dispatch failed', status: ghRes.status, detail: text }, { status: 502 });
  }

  return NextResponse.json({ collection_id: collectionId, mode });
}
