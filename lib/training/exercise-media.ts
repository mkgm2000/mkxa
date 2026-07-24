// Media URL builder for exercise gif/thumbnail assets.
//
// Media (© Gym visual — gymvisual.com) is vendored to our own Supabase
// Storage bucket `exercise-media` (owned copy, not a hotlink). Files are
// keyed by exercise id: gif/{id}.gif and thumb/{id}.jpg.
//
// Override the base with NEXT_PUBLIC_EXERCISE_MEDIA_BASE. For local dev this
// points at /exercise-media-dev (gitignored copy) so previews work before the
// Storage upload; in prod it defaults to the Supabase Storage public URL.

const DEFAULT_BASE =
  'https://jxyqbtttgpdokotmbeud.supabase.co/storage/v1/object/public/exercise-media';

export const MEDIA_BASE = (
  process.env.NEXT_PUBLIC_EXERCISE_MEDIA_BASE || DEFAULT_BASE
).replace(/\/$/, '');

export const EXERCISE_ATTRIBUTION = '© Gym visual — gymvisual.com';

// gif360/ holds the full catalog re-encoded to 360² (ffmpeg lanczos) for
// sharper display. The original 180² gif/ prefix is kept untouched as an
// instant rollback: revert this path to `/gif/` and redeploy.
export function gifUrl(id: string): string {
  return `${MEDIA_BASE}/gif360/${id}.gif`;
}

export function thumbUrl(id: string): string {
  return `${MEDIA_BASE}/thumb/${id}.jpg`;
}
