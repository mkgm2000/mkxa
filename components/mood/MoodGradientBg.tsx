'use client';

import clsx from 'clsx';
import { getMoodTokens, type Mood } from '@/lib/moods';

export interface MoodGradientBgProps extends React.HTMLAttributes<HTMLDivElement> {
  mood: Mood;
  children: React.ReactNode;
}

export function MoodGradientBg({ mood, children, className, style, ...rest }: MoodGradientBgProps) {
  const t = getMoodTokens(mood);
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
