'use client';

import clsx from 'clsx';
import { MoodBlob } from './MoodBlob';
import { MOODS, getMoodTokens, type Mood } from '@/lib/moods';

export interface MoodTokenStripProps {
  value: Mood;
  onChange: (m: Mood) => void;
  className?: string;
}

export function MoodTokenStrip({ value, onChange, className }: MoodTokenStripProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Estado de ánimo"
      className={clsx(
        'flex w-full snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
    >
      {MOODS.map((m) => {
        const active = m === value;
        const label  = getMoodTokens(m).label;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => onChange(m)}
            className={clsx(
              'flex w-[88px] shrink-0 snap-center flex-col items-center gap-2 rounded-2xl p-1 transition-all',
              active ? 'scale-105 opacity-100' : 'opacity-50'
            )}
          >
            <MoodBlob mood={m} size={72} animate={active} withFloor={false} withParticles={false} />
            <span className="text-[13px] font-medium text-ink">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
