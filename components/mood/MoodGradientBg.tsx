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
    const prevTheme = document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null;
    root.style.setProperty('--mood-bg', t.cardFrom);
    // Also paint body directly so the chrome behind the safe-area matches
    // without depending on var-cascade timing.
    body.style.backgroundColor = t.cardFrom;
    // Sync iOS Safari status-bar chrome too.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.cardFrom);
    return () => {
      if (prevVar) root.style.setProperty('--mood-bg', prevVar);
      else root.style.removeProperty('--mood-bg');
      body.style.backgroundColor = prevBody;
      if (prevTheme) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', prevTheme);
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
