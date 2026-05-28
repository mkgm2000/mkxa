'use client';

import { useRouter } from 'next/navigation';
import { MoodBlob } from '@/components/mood/MoodBlob';
import { setAthlete, type Athlete } from '@/lib/athlete-context';

export default function PickPage() {
  const router = useRouter();
  const pick = (a: Athlete) => {
    setAthlete(a);
    router.push('/home');
  };

  return (
    <main
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-10 bg-neutral-50 px-6"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <h1 className="text-center font-sans text-[40px] font-extrabold tracking-tightest text-ink">
        ¿Quién entra?
      </h1>

      <div className="flex w-full max-w-md flex-col gap-4">
        <button
          type="button"
          onClick={() => pick('MK')}
          aria-label="Entrar como MK"
          className="flex items-center justify-between rounded-card bg-white p-5 shadow-card transition-transform duration-150 active:scale-95"
        >
          <span className="font-sans text-3xl font-extrabold tracking-tight text-ink">MK</span>
          <MoodBlob mood="love" size={64} withFloor={false} withParticles={false} />
        </button>

        <button
          type="button"
          onClick={() => pick('Xabi')}
          aria-label="Entrar como Xabi"
          className="flex items-center justify-between rounded-card bg-white p-5 shadow-card transition-transform duration-150 active:scale-95"
        >
          <span className="font-sans text-3xl font-extrabold tracking-tight text-ink">Xabi</span>
          <MoodBlob mood="joyful" size={64} withFloor={false} withParticles={false} />
        </button>
      </div>
    </main>
  );
}
