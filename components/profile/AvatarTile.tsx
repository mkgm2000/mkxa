'use client';

import { useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import { AvatarCircle } from './AvatarCircle';
import { AvatarUploadButton } from './AvatarUploadButton';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';
import { useWeekStreak } from '@/lib/hooks/use-week-streak';
import { setAthlete, type Athlete } from '@/lib/athlete-context';

export function AvatarTile({ athlete }: { athlete: Athlete }) {
  const router = useRouter();
  const { profile, refresh } = useAthleteProfile(athlete);
  const { streak } = useWeekStreak(athlete);

  function pickAndGo() {
    setAthlete(athlete);
    router.push('/home');
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={pickAndGo}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pickAndGo(); }}
      aria-label={`Entrar como ${athlete}`}
      className="flex w-full max-w-md cursor-pointer items-center gap-4 rounded-card bg-white p-4 shadow-card transition-transform duration-150 active:scale-[0.98]"
    >
      <div className="relative">
        <AvatarCircle athlete={athlete} src={profile?.avatar_url ?? null} size={72} />
        <AvatarUploadButton
          athlete={athlete}
          currentUrl={profile?.avatar_url ?? null}
          variant="overlay"
          onUploaded={() => refresh()}
        />
      </div>
      <div className="flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Atleta
        </p>
        <p className="font-sans text-[28px] font-extrabold leading-none tracking-tightest text-ink">
          {athlete}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[13px] font-medium text-ink-muted">
          <Flame size={14} strokeWidth={1.5} aria-hidden />
          {streak} sem.
        </p>
      </div>
    </div>
  );
}
