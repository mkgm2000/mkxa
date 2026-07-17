'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MoodCheckIn } from './MoodCheckIn';
import { MoodGradientBg } from './MoodGradientBg';
import { useAthlete, getStoredAthlete } from '@/lib/athlete-context';
import { useMoodToday } from '@/lib/hooks/use-mood-today';

export function MoodGate({ children }: { children: React.ReactNode }) {
  const athlete = useAthlete();
  const router = useRouter();
  const { mood, loading, save } = useMoodToday(athlete);

  // No athlete in context yet. Either the provider just hasn't hydrated from
  // localStorage (a tick away — wait), or nothing was ever picked on this
  // origin. In the latter case the mood screen would be a dead end because
  // save() no-ops without an athlete, so send the user to /pick to choose.
  useEffect(() => {
    if (!athlete && getStoredAthlete() == null) {
      router.replace('/pick');
    }
  }, [athlete, router]);

  if (!athlete) {
    return <div className="min-h-dvh bg-white" aria-hidden />;
  }

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
