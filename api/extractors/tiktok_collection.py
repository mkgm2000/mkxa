"""Temporary stub — yt-dlp removed, Vercel Python lambda hit 245MB cap."""
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):  # noqa: N801
    def do_POST(self) -> None:  # noqa: N802
        self.send_response(503)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'extractor temporarily disabled'}).encode('utf-8'))
