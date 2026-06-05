'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import { AvatarCircle } from '@/components/profile/AvatarCircle';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';
import { useWeekStreak } from '@/lib/hooks/use-week-streak';
import { setAthlete, type Athlete } from '@/lib/athlete-context';

const ATHLETES: Athlete[] = ['MK', 'Xabi'];
// Soft happy-yellow from the mood palette (happy-from). Reads as warm
// daylight and pairs with both pink (MK) and blue (Xabi) accents.
const PAGE_BG = '#fff4d8';

// Athlete picker. No card box around each slide — content sits directly
// on the page background and the whole screen pans on swipe. Sets
// --mood-bg so iOS safe-area chrome matches the cream backdrop.
export default function PickPage() {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.getPropertyValue('--mood-bg');
    root.style.setProperty('--mood-bg', PAGE_BG);
    return () => {
      if (prev) root.style.setProperty('--mood-bg', prev);
      else root.style.removeProperty('--mood-bg');
    };
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth;
        if (w === 0) return;
        setIndex(Math.round(el.scrollLeft / w));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  function pickAndGo(a: Athlete) {
    setAthlete(a);
    router.push('/home');
  }

  return (
    <main
      className="relative flex min-h-dvh w-full flex-col overflow-hidden text-ink"
      style={{
        backgroundColor: PAGE_BG,
        paddingTop:    'calc(env(safe-area-inset-top, 0px) + 20px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
      }}
    >
      <header className="flex flex-col items-center gap-1.5 px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-ink-muted">
          mkxa
        </p>
        <h1 className="font-sans text-[24px] font-extrabold tracking-tightest text-ink">
          ¿Quién entra?
        </h1>
      </header>

      <div
        ref={scrollerRef}
        className="mt-4 flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {ATHLETES.map((a) => (
          <div key={a} className="flex w-screen shrink-0 snap-center items-stretch justify-center">
            <HeroSlide athlete={a} onEnter={() => pickAndGo(a)} />
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-center gap-1.5">
        {ATHLETES.map((a, i) => (
          <span
            key={a}
            aria-hidden
            className={`h-1.5 rounded-full transition-all duration-200 ${i === index ? 'w-8 bg-ink' : 'w-1.5 bg-ink/20'}`}
          />
        ))}
      </div>
    </main>
  );
}

function HeroSlide({ athlete, onEnter }: { athlete: Athlete; onEnter: () => void }) {
  const { profile } = useAthleteProfile(athlete);
  const { streak } = useWeekStreak(athlete);
  const accent = athlete === 'MK' ? '#ff8aa8' : '#7a9aff';
  const accentHalo = athlete === 'MK' ? 'rgba(255,138,168,0.28)' : 'rgba(122,154,255,0.28)';

  return (
    <button
      type="button"
      onClick={onEnter}
      aria-label={`Entrar como ${athlete}`}
      className="relative flex w-full flex-1 flex-col items-center justify-center gap-8 px-6 transition-transform duration-150 active:scale-[0.985]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: accentHalo }}
      />

      <div className="relative">
        <span
          aria-hidden
          className="absolute inset-0 -m-3 rounded-full"
          style={{ boxShadow: `0 0 0 3px ${accent}` }}
        />
        <AvatarCircle athlete={athlete} src={profile?.avatar_url ?? null} size={224} />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">
          atleta
        </p>
        <p className="font-sans text-[80px] font-extrabold leading-none tracking-tightest text-ink">
          {athlete}
        </p>
        <p className="flex items-center gap-1.5 text-[14px] font-bold text-ink-muted">
          <Flame size={15} strokeWidth={1.75} aria-hidden style={{ color: accent }} />
          {streak} sem.
        </p>
      </div>

      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-full px-8 py-3 text-[12px] font-extrabold uppercase tracking-[0.22em] text-white"
        style={{ backgroundColor: '#1b1d1f' }}
      >
        Entrar
      </span>
    </button>
  );
}
