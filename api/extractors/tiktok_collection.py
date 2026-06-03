"""
POST /api/extractors/tiktok-collection  { url: "<tiktok collection url>" }
  → { items: [{video_url, title, thumbnail, author}], error? }

Resolves a TikTok collection (a user-curated playlist of saved videos) into
the list of individual video URLs + their minimal metadata. yt-dlp does the
heavy lifting in playlist mode, which is the official way to expand a
TikTok collection short-link without scraping HTML.

Instagram has no equivalent public-collection concept (saved posts are
private to the account that saved them), so this endpoint is TikTok-only.
"""
from http.server import BaseHTTPRequestHandler
from typing import Optional
import json
import os
import urllib.error
import urllib.request

import yt_dlp


def _resolve_short_url(url: str) -> str:
    """Follow the redirect chain on vm.tiktok.com / tiktok.com/t/ shortlinks.
    yt-dlp's flat playlist extractor doesn't expand collection short URLs
    on its own, so we resolve them with a HEAD request before passing the
    canonical URL into the extractor.
    """
    lowered = url.lower()
    if 'vm.tiktok.com' not in lowered and '/t/' not in lowered:
        return url
    try:
        req = urllib.request.Request(url, method='GET', headers={
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15',
        })
        with urllib.request.urlopen(req, timeout=8) as r:
            return r.geturl()
    except Exception:
        return url


YDL_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'extract_flat': True,      # don't drill into each video — fast enough
    'skip_download': True,
    'noplaylist': False,
}

MAX_ITEMS = 2000  # MK's biggest collection has ~1000; cap is a sanity rail


def _json_response(handler: BaseHTTPRequestHandler, status: int, body: dict) -> None:
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json')
    handler.send_header('Cache-Control', 'private, max-age=60')
    handler.end_headers()
    handler.wfile.write(json.dumps(body).encode('utf-8'))


def _normalise_item(entry: dict) -> Optional[dict]:
    """Map a yt-dlp playlist entry to the shape the client expects."""
    if not isinstance(entry, dict):
        return None
    video_id = entry.get('id')
    # Prefer the canonical user/video URL from the entry; fall back to a
    # reconstructed one for entries that only have the id.
    url = entry.get('url') or entry.get('webpage_url')
    uploader = entry.get('uploader') or entry.get('channel') or ''
    if not url and video_id and uploader:
        url = f'https://www.tiktok.com/@{uploader}/video/{video_id}'
    if not url:
        return None
    raw_title = (entry.get('title') or entry.get('description') or '').strip()
    # Trim long descriptions to a sensible recipe title length.
    title = raw_title.split('\n', 1)[0][:80] if raw_title else '(sin título)'
    thumbnail = entry.get('thumbnail')
    if not thumbnail and isinstance(entry.get('thumbnails'), list) and entry['thumbnails']:
        thumbnail = entry['thumbnails'][0].get('url')
    return {
        'video_url': url,
        'title': title,
        'thumbnail': thumbnail,
        'author': uploader,
    }


def _insert_collection(
    *,
    title: str,
    source_url: str,
    items: list,
    cover_url: Optional[str],
    created_by: Optional[str],
) -> Optional[dict]:
    """Insert directly into Supabase via PostgREST. Lives server-side so the
    save can't be cut by the browser closing or backgrounding mid-upload.
    Returns the new row {id} on success, None on failure (the client can
    still retry from its end as a fallback).
    """
    # Env vars set via the Vercel UI sometimes ship with a trailing newline.
    # `http.client` raises InvalidURL on any control character in the host,
    # so we trim aggressively before composing the URL.
    raw_base = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or ''
    raw_key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') or ''
    base = raw_base.strip().rstrip('/')
    key = raw_key.strip()
    if not base or not key:
        return None
    payload = json.dumps({
        'title': title,
        'source_url': source_url,
        'source_type': 'tiktok',
        'items': items,
        'cover_url': cover_url,
        'created_by': created_by,
    }).encode('utf-8')
    req = urllib.request.Request(
        f'{base}/rest/v1/recipe_collections',
        data=payload,
        method='POST',
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode('utf-8')
            rows = json.loads(body)
            if isinstance(rows, list) and rows:
                return {'id': rows[0].get('id')}
            return None
    # Catch-all: InvalidURL, ssl errors, ConnectionReset, etc. are not
    # subclasses of URLError, so a tighter except would silently 500.
    except Exception:  # noqa: BLE001
        return None


class handler(BaseHTTPRequestHandler):  # noqa: N801 — Vercel entry point name
    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get('content-length') or '0')
        if length <= 0:
            return _json_response(self, 400, {'error': 'missing body'})
        try:
            body = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return _json_response(self, 400, {'error': 'invalid json'})

        raw = (body.get('url') or '').strip()
        # Strip control characters and zero-width joiners that creep in via
        # copy-paste from TikTok's share sheet — `http.client` rejects them
        # with InvalidURL otherwise.
        url = ''.join(c for c in raw if c.isprintable() and c not in ('​', '‌', '‍', '﻿'))
        if not url or 'tiktok.com' not in url.lower():
            return _json_response(self, 400, {'error': 'not a tiktok url'})

        url = _resolve_short_url(url)

        try:
            with yt_dlp.YoutubeDL(YDL_OPTS) as ydl:
                info = ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as exc:
            return _json_response(self, 502, {'error': f'extract failed: {exc}'})
        except Exception as exc:  # noqa: BLE001
            return _json_response(self, 500, {'error': f'unexpected: {exc}'})

        if not isinstance(info, dict):
            return _json_response(self, 502, {'error': 'unexpected response shape'})

        entries = info.get('entries') if 'entries' in info else None
        if entries is None:
            # Single video → wrap it so the client always sees a list.
            normalised = _normalise_item(info)
            entries_out = [normalised] if normalised else []
        else:
            entries_out = []
            for e in entries[:MAX_ITEMS]:
                n = _normalise_item(e)
                if n is not None:
                    entries_out.append(n)

        if not entries_out:
            return _json_response(self, 502, {'error': 'no videos found in collection'})

        collection_title = info.get('title') or info.get('playlist') or 'Colección sin título'
        cover_url = entries_out[0].get('thumbnail') if entries_out else None

        # Persist the collection server-side so a flaky browser connection
        # (mobile backgrounding the tab, navigation, network blip) can't
        # cut the upload. The client just polls for the row to appear.
        created_by = body.get('created_by')
        source_url = body.get('original_url') or url
        save_result = _insert_collection(
            title=collection_title,
            source_url=source_url,
            items=entries_out,
            cover_url=cover_url,
            created_by=created_by if created_by in ('MK', 'Xabi') else None,
        )

        return _json_response(self, 200, {
            'items': entries_out,
            'collection_title': collection_title,
            'collection_id': save_result.get('id') if save_result else None,
            'saved': bool(save_result),
            'save_error': None if save_result else 'persist failed (will need client-side retry)',
        })

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
