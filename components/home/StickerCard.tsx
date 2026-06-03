'use client';

import clsx from 'clsx';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface Props {
  /** Tilt angle in degrees. Negative leans left, positive right. */
  tilt?: number;
  /** Optional href — when set, the sticker is a Link instead of a div. */
  href?: string;
  /** Horizontal nudge: `left | center | right` controls margin alignment. */
  align?: 'left' | 'center' | 'right';
  /** Inline style escape hatch — mainly for setting backgroundColor per mood. */
  style?: React.CSSProperties;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}

// Sticker = white surface with a slight rotation + a pronounced drop
// shadow so it reads as "stuck on" the gradient page underneath. Used
// throughout /home for the collage layout (redesign option C). Active
// scale damps the tilt to feel responsive.
export function StickerCard({
  tilt = 0,
  href,
  align = 'center',
  style,
  className,
  children,
  ariaLabel,
}: Props) {
  const margin =
    align === 'left' ? 'mr-auto'
    : align === 'right' ? 'ml-auto'
    : 'mx-auto';

  const merged: React.CSSProperties = {
    transform: `rotate(${tilt}deg)`,
    boxShadow:
      '0 14px 28px -10px rgba(20,24,30,0.18), 0 2px 6px -2px rgba(20,24,30,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
    ...style,
  };

  const cls = clsx(
    'block max-w-[88%] rounded-card bg-white p-4 transition-transform duration-150 active:scale-[0.98] active:rotate-0',
    margin,
    className,
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={cls} style={merged}>
        {children}
      </Link>
    );
  }
  return (
    <div aria-label={ariaLabel} className={cls} style={merged}>
      {children}
    </div>
  );
}
