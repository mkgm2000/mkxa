'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { MoodBlob } from './MoodBlob';
import { MoodGradientBg } from './MoodGradientBg';
import { MoodTokenStrip } from './MoodTokenStrip';
import { WaveDecoration } from './WaveDecoration';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';
import { getMoodTokens, type Mood } from '@/lib/moods';

export interface MoodCheckInProps {
  initial?: Mood;
  onConfirm: (m: Mood) => void;
}

export function MoodCheckIn({ initial = 'happy', onConfirm }: MoodCheckInProps) {
  const [mood, setMood] = useState<Mood>(initial);
  const label = getMoodTokens(mood).label;

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

        <div className="flex flex-1 items-center justify-center">
          <MoodBlob mood={mood} size={280} animate withFloor withParticles />
        </div>

        <WaveDecoration className="h-12 w-full max-w-[360px]" />
      </section>

      <footer
        className="flex flex-col items-center gap-2 px-2 pb-8"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <MoodTokenStrip value={mood} onChange={setMood} />
        <p data-testid="mood-checkin-label" className="text-base font-bold text-ink">
          {label}
        </p>
      </footer>
    </MoodGradientBg>
  );
}
