'use client';

import { useRouter } from 'next/navigation';
import { AvatarCircle } from './AvatarCircle';
import { AvatarUploadButton } from './AvatarUploadButton';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';
import { setAthlete, type Athlete } from '@/lib/athlete-context';

export function AthleteCard({ athlete }: { athlete: Athlete }) {
  const router = useRouter();
  const { profile, refresh } = useAthleteProfile(athlete);

  function change() {
    setAthlete(null);
    router.push('/pick');
  }

  return (
    <section className="mx-5 flex flex-col items-center gap-4 rounded-card bg-white p-5 shadow-card">
      <div className="relative">
        <AvatarCircle athlete={athlete} src={profile?.avatar_url ?? null} size={96} />
      </div>
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Atleta</p>
        <p className="font-sans text-[28px] font-extrabold leading-none tracking-tightest text-ink">{athlete}</p>
      </div>
      <AvatarUploadButton
        athlete={athlete}
        currentUrl={profile?.avatar_url ?? null}
        variant="inline"
        onUploaded={() => refresh()}
      />
      <button
        type="button"
        onClick={change}
        className="w-full rounded-action border border-ink-soft px-4 py-2 text-[13px] font-medium text-ink"
      >
        Cambiar atleta
      </button>
    </section>
  );
}
