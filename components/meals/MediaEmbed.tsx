'use client';

import { TikTokEmbed } from './TikTokEmbed';

interface MediaEmbedProps {
  url: string | null;
  poster?: string | null;
  /** Optional explicit source — overrides URL host detection. */
  sourceType?: 'tiktok' | 'instagram' | string | null;
}

export function detectSource(url: string | null): 'tiktok' | 'instagram' | null {
  if (!url) return null;
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'instagram';
  return null;
}

// Extracts a canonical Instagram reel/post embed URL from any shape:
//   https://www.instagram.com/reel/<id>/...
//   https://www.instagram.com/p/<id>/...
//   https://www.instagram.com/reels/<id>...
//   https://instagram.com/<user>/reel/<id>...
// Returns null if no shortcode found — caller should fall back to "open in
// Instagram" link.
export function instagramEmbedUrl(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  return `https://www.instagram.com/p/${m[1]}/embed/captioned/`;
}

export function MediaEmbed({ url, poster, sourceType }: MediaEmbedProps) {
  const source = sourceType === 'tiktok' || sourceType === 'instagram'
    ? sourceType
    : detectSource(url);

  if (source === 'instagram') {
    return <InstagramEmbed url={url} poster={poster} />;
  }
  // Default to TikTok pipeline (also handles slideshow auto-detect).
  return <TikTokEmbed url={url} poster={poster} />;
}

function InstagramEmbed({ url, poster: _poster }: { url: string | null; poster?: string | null }) {
  const embedUrl = url ? instagramEmbedUrl(url) : null;
  if (!embedUrl) {
    return (
      <div className="mx-auto flex w-full max-w-[420px] items-center justify-center rounded-card bg-ink-soft px-4 py-8 text-center text-[13px] text-ink-muted">
        Sin video Instagram asociado
      </div>
    );
  }
  // Instagram's official embed iframe renders the video flanked by a
  // profile header (~64 px) and a footer with likes/share/save (~150 px),
  // and we can't restyle a cross-origin iframe. So we render the iframe at
  // a height that's the sum of header + video + footer, then offset it
  // upward inside a `overflow-hidden` container so only the central video
  // area is visible. The fixed pixel offsets are tuned to IG's current
  // embed layout; if they redesign we'll need to retune.
  const HEADER_PX = 64;
  const FOOTER_PX = 160;
  return (
    <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-card bg-black shadow-card">
      <div className="relative w-full" style={{ aspectRatio: '9/16', maxHeight: '78vh' }}>
        <iframe
          src={embedUrl}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; autoplay; fullscreen"
          allowFullScreen
          className="absolute left-0 right-0 border-0 bg-white"
          style={{
            top: `-${HEADER_PX}px`,
            width: '100%',
            height: `calc(100% + ${HEADER_PX + FOOTER_PX}px)`,
          }}
          title="Instagram video"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          scrolling="no"
        />
      </div>
    </div>
  );
}
