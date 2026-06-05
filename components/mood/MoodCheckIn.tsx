'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { MoodSlider } from './MoodSlider';
import { MoodGradientBg } from './MoodGradientBg';
import { type Mood } from '@/lib/moods';

export interface MoodCheckInProps {
  initial?: Mood;
  onConfirm: (m: Mood) => void;
}

export function MoodCheckIn({ initial = 'happy', onConfirm }: MoodCheckInProps) {
  const [mood, setMood] = useState<Mood>(initial);

  return (
    <MoodGradientBg
      mood={mood}
      className="fixed inset-0 flex flex-col overflow-hidden"
    >
      <section
        className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}
      >
        <h1 className="font-sans text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink">
          ¿Cómo estás<br />realmente hoy?
        </h1>

        <MoodSlider value={mood} onChange={setMood} />
      </section>

      <footer
        className="flex items-center justify-center px-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', paddingTop: 16 }}
      >
        <button
          type="button"
          onClick={() => onConfirm(mood)}
          aria-label="Confirmar mood"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-ink shadow-card transition-transform duration-150 active:scale-95"
        >
          <Check size={26} strokeWidth={2} className="text-white" aria-hidden />
        </button>
      </footer>
    </MoodGradientBg>
  );
}
