'use client';

import { useEffect } from 'react';
import clsx from 'clsx';
import { getMoodTokens, type Mood } from '@/lib/moods';

export interface MoodGradientBgProps extends React.HTMLAttributes<HTMLDivElement> {
  mood: Mood;
  children: React.ReactNode;
}

/**
 * Paints the mood gradient as the page background.
 *
 * In addition to the in-flow `<div>` (kept for the visible content area and
 * test backwards-compatibility — tests assert `linear-gradient(170deg…`),
 * this component also mirrors the gradient stops onto `--mood-bg-from` /
 * `--mood-bg-to` CSS variables on `<html>`. `globals.css` reads those vars
 * and paints them on the html element with `background-attachment: fixed`,
 * so iOS Safari overscroll reveals the mood gradient instead of white edges.
 *
 * When this component unmounts we clear the vars so the CSS fallback color
 * kicks back in. When multiple instances are mounted (e.g. the page-level
 * `MoodGate` wrapping the meals/expenses inner overrides), React's
 * bottom-up effect ordering means the outermost / latest-mounted parent's
 * effect runs last and wins — so the html background tracks the user's
 * daily mood, while the inner override paints its own gradient over the
 * content area as before.
 */
export function MoodGradientBg({ mood, children, className, style, ...rest }: MoodGradientBgProps) {
  const t = getMoodTokens(mood);

  useEffect(() => {
    const root = document.documentElement;
    const prevFrom = root.style.getPropertyValue('--mood-bg-from');
    const prevTo = root.style.getPropertyValue('--mood-bg-to');
    root.style.setProperty('--mood-bg-from', t.cardFrom);
    root.style.setProperty('--mood-bg-to', t.cardTo);
    return () => {
      // Restore the previous values (or clear if there were none) so nested
      // overrides hand control back to their parent on unmount.
      if (prevFrom) root.style.setProperty('--mood-bg-from', prevFrom);
      else root.style.removeProperty('--mood-bg-from');
      if (prevTo) root.style.setProperty('--mood-bg-to', prevTo);
      else root.style.removeProperty('--mood-bg-to');
    };
  }, [t.cardFrom, t.cardTo]);

  return (
    <div
      {...rest}
      className={clsx('min-h-dvh w-full transition-[background-image] duration-300', className)}
      style={{
        backgroundImage: `linear-gradient(170deg, ${t.cardFrom} 0%, ${t.cardTo} 100%)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
