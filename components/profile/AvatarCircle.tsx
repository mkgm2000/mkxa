'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { getMoodTokens } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

interface AvatarCircleProps {
  athlete: Athlete;
  src: string | null;
  size?: number;
  className?: string;
}

export function AvatarCircle({ athlete, src, size = 72, className }: AvatarCircleProps) {
  const [broken, setBroken] = useState(false);
  const fallbackMood = athlete === 'MK' ? 'love' : 'joyful';
  const bg = getMoodTokens(fallbackMood).bodyMid;
  const initials = athlete === 'MK' ? 'M' : 'X';
  const fontSize = Math.round(size * 0.45);

  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Avatar ${athlete}`}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className={clsx('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Avatar ${athlete}`}
      className={clsx(
        'flex items-center justify-center rounded-full font-sans font-extrabold text-white',
        className,
      )}
      style={{ width: size, height: size, backgroundColor: bg, fontSize }}
    >
      {initials}
    </div>
  );
}
