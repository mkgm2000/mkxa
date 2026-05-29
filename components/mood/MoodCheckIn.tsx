'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { MoodSlider } from './MoodSlider';
import { MoodGradientBg } from './MoodGradientBg';
import { WaveDecoration } from './WaveDecoration';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';
import { type Mood } from '@/lib/moods';

export interface MoodCheckInProps {
  initial?: Mood;
  onConfirm: (m: Mood) => void;
}

export function MoodCheckIn({ initial = 'happy', onConfirm }: MoodCheckInProps) {
  const [mood, setMood] = useState<Mood>(initial);

  return (
    <MoodGradientBg mood={mood} className="flex flex-col">
      <header
        className="flex items-start justify-between px-5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <span aria-hidden className="h-10 w-10" />
        <HeaderActionButton
          icon={Check}
          label="Confirmar"
          onClick={() => onConfirm(mood)}
        />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="font-sans text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink">
          ¿Cómo estás<br />realmente hoy?
        </h1>

        <WaveDecoration className="h-12 w-full max-w-[360px]" />

        <MoodSlider value={mood} onChange={setMood} />
      </section>

      <div className="h-8" />
    </MoodGradientBg>
  );
}
