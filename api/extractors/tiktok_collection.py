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
import json

import yt_dlp


YDL_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'extract_flat': True,      # don't drill into each video — fast enough
    'skip_download': True,
    'noplaylist': False,
}

MAX_ITEMS = 60  # protect against gigantic collections


def _json_response(handler: BaseHTTPRequestHandler, status: int, body: dict) -> None:
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json')
    handler.send_header('Cache-Control', 'private, max-age=60')
    handler.end_headers()
    handler.wfile.write(json.dumps(body).encode('utf-8'))


def _normalise_item(entry: dict) -> dict | None:
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


class handler(BaseHTTPRequestHandler):  # noqa: N801 — Vercel entry point name
    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get('content-length') or '0')
        if length <= 0:
            return _json_response(self, 400, {'error': 'missing body'})
        try:
            body = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return _json_response(self, 400, {'error': 'invalid json'})

        url = (body.get('url') or '').strip()
        if not url or 'tiktok.com' not in url.lower():
            return _json_response(self, 400, {'error': 'not a tiktok url'})

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

        return _json_response(self, 200, {
            'items': entries_out,
            'collection_title': info.get('title') or info.get('playlist') or None,
        })

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
