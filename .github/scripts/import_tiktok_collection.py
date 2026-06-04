"""
Worker run by .github/workflows/tiktok-collection-import.yml.

Expands a TikTok collection URL with yt-dlp's flat playlist extractor
and writes items into the `recipe_collections` row identified by
--collection-id, updating import_status + import_progress as it goes so
the mkxa web client can show a progressive loader.

Modes:
  new       — the row exists but is empty; replace items wholesale.
  refresh   — fetch existing items, append only new ones (dedup by
              video_url).

Env:
  SUPABASE_URL  — project URL (https://*.supabase.co).
  SUPABASE_KEY  — service-role key (write-anywhere; never logged).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from typing import Optional

import requests
import yt_dlp


BATCH_SIZE = 100  # items per progress update / db write
MAX_ITEMS = 5000  # absolute sanity cap


def _supabase_url() -> str:
    base = (os.environ.get('SUPABASE_URL') or '').strip().rstrip('/')
    if not base:
        print('FATAL: SUPABASE_URL missing', flush=True)
        sys.exit(2)
    return base


def _supabase_key() -> str:
    key = (os.environ.get('SUPABASE_KEY') or '').strip()
    if not key:
        print('FATAL: SUPABASE_KEY missing', flush=True)
        sys.exit(2)
    return key


def _headers() -> dict:
    k = _supabase_key()
    return {
        'apikey': k,
        'Authorization': f'Bearer {k}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }


def patch_row(collection_id: str, payload: dict) -> None:
    """Patch the recipe_collections row. Logs (but doesn't crash) on failure."""
    url = f'{_supabase_url()}/rest/v1/recipe_collections?id=eq.{collection_id}'
    try:
        r = requests.patch(url, headers=_headers(), data=json.dumps(payload), timeout=15)
        if r.status_code >= 400:
            print(f'WARN: patch_row {r.status_code}: {r.text[:200]}', flush=True)
    except requests.RequestException as exc:
        print(f'WARN: patch_row network: {exc}', flush=True)


def fetch_existing_items(collection_id: str) -> list:
    url = f'{_supabase_url()}/rest/v1/recipe_collections?id=eq.{collection_id}&select=items'
    try:
        r = requests.get(url, headers=_headers(), timeout=15)
        if r.status_code >= 400:
            print(f'WARN: fetch_existing {r.status_code}: {r.text[:200]}', flush=True)
            return []
        rows = r.json()
        if not rows:
            return []
        return rows[0].get('items') or []
    except requests.RequestException as exc:
        print(f'WARN: fetch_existing network: {exc}', flush=True)
        return []


def update_progress(collection_id: str, phase: str, processed: int, total: int, message: str = '') -> None:
    patch_row(collection_id, {
        'import_progress': {
            'phase': phase,
            'processed': processed,
            'total': total,
            'message': message,
        }
    })


def set_status(collection_id: str, status: str, message: str = '') -> None:
    patch_row(collection_id, {
        'import_status': status,
        'import_progress': {
            'phase': status,
            'processed': 0,
            'total': 0,
            'message': message,
        }
    })


def normalise_item(entry: dict) -> Optional[dict]:
    if not isinstance(entry, dict):
        return None
    video_id = entry.get('id')
    url = entry.get('url') or entry.get('webpage_url')
    uploader = entry.get('uploader') or entry.get('channel') or ''
    if not url and video_id and uploader:
        url = f'https://www.tiktok.com/@{uploader}/video/{video_id}'
    if not url:
        return None
    raw_title = (entry.get('title') or entry.get('description') or '').strip()
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


def extract_items(url: str) -> tuple[list, Optional[str]]:
    """Returns (items, collection_title)."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'skip_download': True,
        'noplaylist': False,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
    if not isinstance(info, dict):
        return ([], None)
    title = info.get('title') or info.get('playlist')
    raw = info.get('entries')
    if raw is None:
        one = normalise_item(info)
        return ([one] if one else [], title)
    items: list = []
    for e in raw:
        if len(items) >= MAX_ITEMS:
            break
        n = normalise_item(e)
        if n is not None:
            items.append(n)
    return (items, title)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--collection-id', required=True)
    p.add_argument('--url', required=True)
    p.add_argument('--mode', default='new', choices=['new', 'refresh'])
    p.add_argument('--athlete', default='')
    args = p.parse_args()

    collection_id = args.collection_id
    started = time.time()

    try:
        set_status(collection_id, 'extracting', 'Pidiendo lista a TikTok…')
        new_items, scraped_title = extract_items(args.url)
        if not new_items:
            set_status(collection_id, 'failed', 'TikTok no devolvió vídeos para esta URL.')
            return 1

        # Merge logic.
        if args.mode == 'refresh':
            existing = fetch_existing_items(collection_id)
            existing_urls = {it.get('video_url') for it in existing if isinstance(it, dict)}
            additions = [it for it in new_items if it['video_url'] not in existing_urls]
            merged = additions + existing  # new at top so MK sees them first
            print(f'refresh: {len(additions)} new of {len(new_items)} scraped', flush=True)
        else:
            merged = new_items
            additions = new_items
            print(f'new: {len(new_items)} scraped', flush=True)

        total = len(merged)
        cover_url = merged[0].get('thumbnail') if merged else None

        # Save in batches so the UI sees progress climb. We update item_count
        # alongside each write.
        update_progress(collection_id, 'saving', 0, total, f'Guardando {total} vídeos…')
        for idx in range(0, total, BATCH_SIZE):
            chunk = merged[: idx + BATCH_SIZE]
            patch_row(collection_id, {
                'items': chunk,
                'item_count': len(chunk),
                'cover_url': cover_url,
                'import_progress': {
                    'phase': 'saving',
                    'processed': len(chunk),
                    'total': total,
                    'message': f'{len(chunk)}/{total}',
                },
            })

        # Final state.
        title_update = {}
        if args.mode == 'new' and scraped_title:
            title_update['title'] = scraped_title
        patch_row(collection_id, {
            **title_update,
            'import_status': 'completed',
            'import_progress': {
                'phase': 'completed',
                'processed': total,
                'total': total,
                'message': f'{len(additions)} nuevos · total {total}',
            },
        })
        print(f'done in {time.time() - started:.1f}s · {total} items', flush=True)
        return 0

    except SystemExit:
        raise
    except BaseException as exc:  # noqa: BLE001
        traceback.print_exc()
        set_status(collection_id, 'failed', f'{type(exc).__name__}: {exc}'[:200])
        return 1


if __name__ == '__main__':
    sys.exit(main())
