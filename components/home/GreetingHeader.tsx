'use client';

import Link from 'next/link';
import { AvatarCircle } from '@/components/profile/AvatarCircle';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';
import { getMoodTokens, type Mood } from '@/lib/moods';
import type { Athlete } from '@/lib/athlete-context';

export interface GreetingHeaderProps {
  athlete: Athlete;
  now?: Date;
  todayMood: Mood;
}

export function GreetingHeader({ athlete, now = new Date(), todayMood }: GreetingHeaderProps) {
  const { profile } = useAthleteProfile(athlete);
  const h = now.getHours();
  const part =
    h < 12 ? 'Buenos días' :
    h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const moodLabel = getMoodTokens(todayMood).label;

  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-6">
      <div>
        <h1 className="font-sans text-[36px] font-extrabold leading-[1.05] tracking-tightest text-ink">
          {part}, {athlete},<br />¿qué tal hoy?
        </h1>
        <p className="mt-2 text-[13px] text-ink-muted">
          Has registrado: <span className="font-medium text-ink">{moodLabel}</span>
        </p>
      </div>
      <Link href="/profile" aria-label="Ir al perfil">
        <AvatarCircle athlete={athlete} src={profile?.avatar_url ?? null} size={40} />
      </Link>
    </header>
  );
}
