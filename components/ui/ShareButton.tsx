'use client';

import { useEffect, useState } from 'react';
import { Share2, Check, Link as LinkIcon } from 'lucide-react';
import clsx from 'clsx';
import { useShare, type ShareTarget } from '@/lib/hooks/use-share';

interface ShareButtonProps {
  /** Item kind + id + title; powers the URL and the system share sheet. */
  target: ShareTarget;
  /** Optional className override for sizing/placement inside a card row. */
  className?: string;
  /** Accessible label — falls back to "Compartir". */
  label?: string;
  /** Icon size in px. Defaults to 14 to match other card-row actions. */
  iconSize?: number;
  /** When true, stops click from propagating to a parent <Link> or button. */
  stopPropagation?: boolean;
}

// Re-usable share trigger. Renders the lucide `Share2` icon inside a
// round chip; flips to a check when the link was copied so the user gets
// instant feedback even on browsers without a native share sheet.
export function ShareButton({
  target,
  className,
  label = 'Compartir',
  iconSize = 14,
  stopPropagation = true,
}: ShareButtonProps) {
  const { share, status } = useShare();
  // Local copy of status so we can show a transient "Link copiado" hint
  // bubble anchored to the button itself (the hook also has its own
  // timer; we mirror it here so we can render the bubble in this scope).
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (status === 'copied' || status === 'shared') {
      setShowHint(true);
      const t = window.setTimeout(() => setShowHint(false), 1500);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [status]);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          if (stopPropagation) {
            e.preventDefault();
            e.stopPropagation();
          }
          void share(target);
        }}
        className={clsx(
          'flex h-7 w-7 items-center justify-center rounded-full bg-ink-soft text-ink transition-colors active:scale-95',
          className,
        )}
      >
        {status === 'copied' ? (
          <Check size={iconSize} strokeWidth={2} aria-hidden />
        ) : (
          <Share2 size={iconSize} strokeWidth={1.75} aria-hidden />
        )}
      </button>
      {showHint && (
        <span
          role="status"
          className="pointer-events-none absolute right-0 top-[110%] z-20 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold text-white shadow-action"
        >
          <LinkIcon size={10} strokeWidth={2} aria-hidden />
          {status === 'shared' ? 'Compartido' : 'Link copiado'}
        </span>
      )}
    </span>
  );
}
