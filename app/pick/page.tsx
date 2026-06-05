'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import { AvatarCircle } from '@/components/profile/AvatarCircle';
import { HyroxCountdown } from '@/components/branding/HyroxCountdown';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';
import { useWeekStreak } from '@/lib/hooks/use-week-streak';
import { setAthlete, type Athlete } from '@/lib/athlete-context';

const ATHLETES: Athlete[] = ['MK', 'Xabi'];

// Trading-card hero carousel for the athlete picker. One card per
// athlete, snap-scroll horizontally, tap to enter. The HYROX dot
// countdown lives below so MK sees how long until race day every
// time she opens the app (the same widget she keeps as her lock
// screen wallpaper).
export default function PickPage() {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

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
      className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-[#0c0d10] text-white"
      style={{
        paddingTop:    'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      }}
    >
      <header className="flex flex-col items-center gap-1 px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/55">
          mkxa
        </p>
        <h1 className="font-sans text-[22px] font-extrabold tracking-tightest text-white">
          ¿Quién entra?
        </h1>
      </header>

      <div
        ref={scrollerRef}
        className="mt-6 flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {ATHLETES.map((a) => (
          <div key={a} className="flex w-screen shrink-0 snap-center items-center justify-center px-6">
            <HeroCard athlete={a} onEnter={() => pickAndGo(a)} />
          </div>
        ))}
      </div>

      <div className="my-4 flex justify-center gap-1.5">
        {ATHLETES.map((a, i) => (
          <span
            key={a}
            aria-hidden
            className={`h-1.5 rounded-full transition-all duration-200 ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/25'}`}
          />
        ))}
      </div>

      <div className="px-6">
        <HyroxCountdown />
      </div>
    </main>
  );
}

function HeroCard({ athlete, onEnter }: { athlete: Athlete; onEnter: () => void }) {
  const { profile } = useAthleteProfile(athlete);
  const { streak } = useWeekStreak(athlete);
  const accent = athlete === 'MK' ? '#ffa3bc' : '#a3bcff';
  const accentSoft = athlete === 'MK' ? 'rgba(255,163,188,0.18)' : 'rgba(163,188,255,0.18)';

  return (
    <button
      type="button"
      onClick={onEnter}
      aria-label={`Entrar como ${athlete}`}
      className="group relative flex w-full max-w-sm flex-col items-center gap-5 overflow-hidden rounded-[40px] border border-white/10 px-6 py-7 text-left transition-transform duration-150 active:scale-[0.985]"
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, ${accentSoft} 0%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0) 100%), linear-gradient(180deg, #131418 0%, #0e0f12 100%)`,
      }}
    >
      <span aria-hidden className="absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-50 blur-3xl" style={{ background: accent }} />

      <div className="relative">
        <span
          aria-hidden
          className="absolute inset-0 -m-2 rounded-full"
          style={{ boxShadow: `0 0 0 2px ${accent}, 0 0 48px 8px ${accentSoft}` }}
        />
        <AvatarCircle athlete={athlete} src={profile?.avatar_url ?? null} size={172} />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
          atleta
        </p>
        <p className="font-sans text-[56px] font-extrabold leading-none tracking-tightest">
          {athlete}
        </p>
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-white/70">
          <Flame size={14} strokeWidth={1.75} aria-hidden style={{ color: accent }} />
          {streak} sem.
        </p>
      </div>

      <span
        aria-hidden
        className="mt-1 inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#0c0d10]"
        style={{ backgroundColor: accent }}
      >
        Entrar
      </span>
    </button>
  );
}
