'use client';

import { useRouter } from 'next/navigation';
import { MoodBlob } from '@/components/mood/MoodBlob';
import { setAthlete, type Athlete } from '@/lib/athlete-context';

export function AthleteCard({ athlete }: { athlete: Athlete }) {
  const router = useRouter();
  function change() {
    setAthlete(null);
    router.push('/pick');
  }
  return (
    <section className="mx-5 flex items-center justify-between rounded-card bg-white p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div className="-my-1">
          <MoodBlob mood={athlete === 'MK' ? 'love' : 'joyful'} size={72} animate withFloor={false} withParticles={false} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Atleta</p>
          <p className="font-sans text-[28px] font-extrabold leading-none tracking-tightest text-ink">{athlete}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={change}
        className="rounded-action border border-ink-soft px-4 py-2 text-[13px] font-medium text-ink"
      >
        Cambiar
      </button>
    </section>
  );
}
