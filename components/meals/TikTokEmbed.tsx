'use client';

import { ExternalLink } from 'lucide-react';

interface TikTokEmbedProps {
  url: string | null;
}

// Extract a numeric video id from a canonical TikTok URL.
// Returns null if URL is a shortlink (vm.tiktok.com / tiktok.com/t/) or non-TikTok.
export function extractTikTokVideoId(url: string | null): string | null {
  if (!url) return null;
  // Match https://www.tiktok.com/@username/video/{numericId}
  const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (m && m[1]) return m[1];
  return null;
}

export function TikTokEmbed({ url }: TikTokEmbedProps) {
  const videoId = extractTikTokVideoId(url);

  if (videoId) {
    return (
      <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-card bg-black shadow-card">
        <div className="relative aspect-[9/16] w-full max-h-[60vh]">
          <iframe
            src={`https://www.tiktok.com/embed/v2/${videoId}`}
            allow="encrypted-media; fullscreen"
            className="absolute inset-0 h-full w-full rounded-card border-0"
            title="TikTok video"
          />
        </div>
      </div>
    );
  }

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto flex w-full max-w-[420px] items-center justify-center gap-2 rounded-card bg-white px-4 py-6 text-[14px] font-bold text-ink shadow-card"
      >
        <ExternalLink size={16} strokeWidth={1.5} aria-hidden />
        Abrir receta en TikTok
      </a>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[420px] items-center justify-center rounded-card bg-ink-soft px-4 py-8 text-center text-[13px] text-ink-muted">
      Sin video TikTok asociado
    </div>
  );
}
