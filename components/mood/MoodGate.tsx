'use client';

import { MoodCheckIn } from './MoodCheckIn';
import { MoodGradientBg } from './MoodGradientBg';
import { useAthlete } from '@/lib/athlete-context';
import { useMoodToday } from '@/lib/hooks/use-mood-today';

export function MoodGate({ children }: { children: React.ReactNode }) {
  const athlete = useAthlete();
  const { mood, loading, save } = useMoodToday(athlete);

  if (loading) {
    return <div className="min-h-dvh bg-white" aria-hidden />;
  }

  if (!mood) {
    return <MoodCheckIn onConfirm={(m) => save(m)} />;
  }

  return (
    <MoodGradientBg mood={mood.mood}>
      {children}
    </MoodGradientBg>
  );
}
