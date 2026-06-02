'use client';

import { useEffect } from 'react';
import clsx from 'clsx';
import { getMoodTokens, type Mood } from '@/lib/moods';

export interface MoodGradientBgProps extends React.HTMLAttributes<HTMLDivElement> {
  mood: Mood;
  children: React.ReactNode;
}

/**
 * Paints the mood gradient as the page background AND mirrors `cardFrom`
 * onto the `--mood-bg` CSS variable on `<html>` so the chrome behind the
 * safe-area (status bar) and any overscroll rubber-band paint the same
 * colour as the top edge of the in-flow gradient. Otherwise iOS Safari
 * shows a contrasting strip above the content.
 *
 * Effect ordering: when multiple `<MoodGradientBg>` are nested (page-level
 * `MoodGate` wrapping the meals/expenses inner overrides), each effect
 * captures the previous var, sets its own, and restores on unmount. The
 * outermost mounted parent runs last and "wins" the var.
 */
export function MoodGradientBg({ mood, children, className, style, ...rest }: MoodGradientBgProps) {
  const t = getMoodTokens(mood);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevVar = root.style.getPropertyValue('--mood-bg');
    const prevBody = body.style.backgroundColor;
    root.style.setProperty('--mood-bg', t.cardFrom);
    // Also paint body directly so the chrome behind the safe-area matches
    // without depending on var-cascade timing.
    body.style.backgroundColor = t.cardFrom;
    // iOS Safari reads <meta name="theme-color"> only when the element is
    // mounted; mutating .content on an existing tag often won't repaint the
    // status bar. Remove and re-insert with the new color to force a fresh
    // read every time the mood changes.
    const head = document.head;
    const existing = head.querySelectorAll('meta[name="theme-color"]');
    existing.forEach((el) => el.remove());
    const fresh = document.createElement('meta');
    fresh.setAttribute('name', 'theme-color');
    fresh.setAttribute('content', t.cardFrom);
    head.appendChild(fresh);
    return () => {
      if (prevVar) root.style.setProperty('--mood-bg', prevVar);
      else root.style.removeProperty('--mood-bg');
      body.style.backgroundColor = prevBody;
      // Leave the meta tag in place: the next mount (or another
      // MoodGradientBg) will replace it. Re-inserting prevTheme here would
      // race with overlapping mounts and flicker the status bar mid-nav.
    };
  }, [t.cardFrom]);

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
