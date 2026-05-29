'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { MoodBlob } from './MoodBlob';
import { MOOD_ORDER, getMoodTokens, type Mood } from '@/lib/moods';

interface MoodSliderProps {
  value: Mood;
  onChange: (m: Mood) => void;
  className?: string;
}

const N = MOOD_ORDER.length; // 10

function indexOf(mood: Mood): number {
  const i = MOOD_ORDER.indexOf(mood);
  return i < 0 ? 0 : i;
}

function trackGradient(): string {
  const stops = MOOD_ORDER.map((m, i) => {
    const pct = (i / (N - 1)) * 100;
    return `${getMoodTokens(m).bodyMid} ${pct.toFixed(1)}%`;
  }).join(', ');
  return `linear-gradient(to right, ${stops})`;
}

export function MoodSlider({ value, onChange, className }: MoodSliderProps) {
  const initialIdx = indexOf(value);
  const [pos, setPos] = useState<number>(initialIdx / (N - 1));
  const trackRef = useRef<HTMLDivElement | null>(null);
  const idx = Math.min(N - 1, Math.max(0, Math.round(pos * (N - 1))));
  const mood = MOOD_ORDER[idx];
  const label = getMoodTokens(mood).label;

  // Notify the parent only when the discrete idx changes.
  const lastIdxRef = useRef<number>(initialIdx);
  useEffect(() => {
    if (idx !== lastIdxRef.current) {
      lastIdxRef.current = idx;
      onChange(mood);
    }
  }, [idx, mood, onChange]);

  const setFromClientX = useCallback((x: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (x - r.left) / r.width));
    setPos(p);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.buttons & 1) === 0) return;
    setFromClientX(e.clientX);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = 1 / (N - 1);
    const big = e.shiftKey ? step * 2 : step;
    let next = pos;
    if (e.key === 'ArrowRight') next = Math.min(1, pos + big);
    else if (e.key === 'ArrowLeft') next = Math.max(0, pos - big);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 1;
    else return;
    e.preventDefault();
    setPos(next);
  }

  return (
    <section
      className={clsx('flex flex-col items-center gap-4', className)}
    >
      <MoodBlob mood={mood} size={280} animate withFloor withParticles />

      <p className="font-sans text-[24px] font-extrabold tracking-tightest text-ink">
        {label}
      </p>

      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={N - 1}
        aria-valuenow={idx}
        aria-valuetext={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="relative h-12 w-full max-w-md cursor-pointer touch-none select-none"
      >
        <div
          aria-hidden
          className="absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 rounded-full"
          style={{ backgroundImage: trackGradient() }}
        />
        <div
          aria-hidden
          className="absolute top-1/2"
          style={{ left: `${pos * 100}%`, transform: 'translate(-50%, -50%)' }}
        >
          <MoodBlob mood={mood} size={56} animate={false} withFloor={false} withParticles={false} />
        </div>
      </div>

      <div className="flex w-full max-w-md justify-between text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        <span>Mejor</span>
        <span>Peor</span>
      </div>
    </section>
  );
}
