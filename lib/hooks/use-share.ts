'use client';

import { useCallback, useState } from 'react';

// Shape of an item that can be shared. We accept a title + url + optional
// text/blurb so the calling component can decide what to surface in the
// system share sheet (recipe title, restaurant name, movie title, etc.).
export interface ShareTarget {
  /** 'recipe' | 'restaurant' | 'media' — determines the URL prefix. */
  kind: 'recipe' | 'restaurant' | 'media';
  /** Database id of the item being shared. */
  id: string;
  /** Title used in the share sheet + clipboard toast context. */
  title: string;
  /** Optional one-liner shown above the URL in the share sheet. */
  text?: string;
}

// Tiny UI signal so consumers can display a "Link copiado" toast in their
// own visual language. Resets to 'idle' after ~1.6s so the chip can fade.
export type ShareStatus = 'idle' | 'shared' | 'copied' | 'error';

// NOTE: Share URLs are unauthenticated and contain only the item id —
// anyone with the link can read the item. This is intentional for an MVP
// (the items are mundane: a recipe, a restaurant pick, a movie). If we
// ever expand to private/sensitive data we should swap to a per-share
// signed token table.
function buildShareUrl(kind: ShareTarget['kind'], id: string): string {
  const origin =
    (typeof window !== 'undefined' && window.location?.origin) ||
    'https://mkxa.vercel.app';
  return `${origin}/share/${kind}/${id}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  // Legacy fallback for browsers without the async clipboard API (older
  // iOS Safari in particular). Creates a hidden textarea, selects it,
  // and uses execCommand. Safe to ignore the deprecation warning here —
  // it's the only way to write to the clipboard on some embedded
  // webviews.
  if (typeof document === 'undefined') return false;
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

/**
 * useShare — builds a public share URL for an item and triggers the
 * platform share sheet. Falls back to clipboard when navigator.share is
 * unavailable (desktop browsers, some webviews). Returns a `status`
 * string that consumers can use to show a "Link copiado" toast.
 */
export function useShare() {
  const [status, setStatus] = useState<ShareStatus>('idle');

  const share = useCallback(async (target: ShareTarget): Promise<ShareStatus> => {
    const url = buildShareUrl(target.kind, target.id);

    // Prefer the native share sheet when available — gives users every
    // app (WhatsApp, Mail, AirDrop, …) without us reinventing it.
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      try {
        await navigator.share({
          title: target.title,
          text: target.text ?? target.title,
          url,
        });
        setStatus('shared');
        window.setTimeout(() => setStatus('idle'), 1600);
        return 'shared';
      } catch (err) {
        // AbortError = user closed the share sheet; treat as no-op so we
        // don't show a misleading copied/error chip.
        if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') {
          setStatus('idle');
          return 'idle';
        }
        // Any other failure → fall through to clipboard.
      }
    }

    const ok = await copyToClipboard(url);
    const next: ShareStatus = ok ? 'copied' : 'error';
    setStatus(next);
    window.setTimeout(() => setStatus('idle'), 1600);
    return next;
  }, []);

  return { share, status };
}
