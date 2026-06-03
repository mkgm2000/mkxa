"""
POST /api/extractors/instagram  { url: "<instagram reel/post url>" }
  → { play_url, cover, error? }

Uses yt-dlp to resolve the public MP4 URL for an Instagram reel or post.
Lives in /api/*.py so Vercel runs it on the Python serverless runtime; the
rest of the app stays Next.js. The returned `play_url` points at
scontent-*.cdninstagram.com and carries `Access-Control-Allow-Origin: *`,
so the browser <video> tag can load it directly with no extra proxy.
"""
from http.server import BaseHTTPRequestHandler
import json

import yt_dlp


YDL_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'noplaylist': True,
    'skip_download': True,
    'simulate': True,
    # Force a single MP4 URL; without this yt-dlp may pick a DASH manifest
    # the browser can't play directly.
    'format': 'best[ext=mp4]/best',
}


def _json_response(handler: BaseHTTPRequestHandler, status: int, body: dict) -> None:
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json')
    handler.send_header('Cache-Control', 'private, max-age=60')
    handler.end_headers()
    handler.wfile.write(json.dumps(body).encode('utf-8'))


class handler(BaseHTTPRequestHandler):  # noqa: N801 — Vercel expects this name
    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get('content-length') or '0')
        if length <= 0:
            return _json_response(self, 400, {'error': 'missing body'})
        try:
            body = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return _json_response(self, 400, {'error': 'invalid json'})

        url = (body.get('url') or '').strip()
        if not url or 'instagram.com' not in url.lower():
            return _json_response(self, 400, {'error': 'not an instagram url'})

        try:
            with yt_dlp.YoutubeDL(YDL_OPTS) as ydl:
                info = ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as exc:
            return _json_response(self, 502, {'error': f'extract failed: {exc}'})
        except Exception as exc:  # noqa: BLE001 — defensive last-ditch catch
            return _json_response(self, 500, {'error': f'unexpected: {exc}'})

        # When yt-dlp can't pick a single best format it returns a list of
        # entries (e.g. carousels). Prefer the first playable mp4 URL.
        if isinstance(info, dict) and info.get('entries'):
            entries = [e for e in info['entries'] if isinstance(e, dict)]
            info = next((e for e in entries if e.get('url')), entries[0] if entries else {})

        play_url = info.get('url') if isinstance(info, dict) else None
        cover = info.get('thumbnail') if isinstance(info, dict) else None
        if not play_url:
            return _json_response(self, 502, {'error': 'no mp4 url'})

        return _json_response(self, 200, {'play_url': play_url, 'cover': cover})

    def do_OPTIONS(self) -> None:  # noqa: N802 — CORS preflight
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
