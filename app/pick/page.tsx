'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import { AvatarCircle } from '@/components/profile/AvatarCircle';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';
import { useWeekStreak } from '@/lib/hooks/use-week-streak';
import { setAthlete, type Athlete } from '@/lib/athlete-context';

const ATHLETES: Athlete[] = ['MK', 'Xabi'];
const PAGE_BG = '#0c0d10';

// Trading-card hero carousel for the athlete picker. The HYROX
// countdown lives in HyroxGate (after MoodGate) instead of here, so
// this page stays clean. Sets --mood-bg on <html> so iOS safe-area
// chrome matches the dark backdrop (otherwise globals.css leaves a
// white strip behind the status bar).
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
      className="relative flex min-h-dvh w-full flex-col overflow-hidden text-white"
      style={{
        backgroundColor: PAGE_BG,
        paddingTop:    'calc(env(safe-area-inset-top, 0px) + 20px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)',
      }}
    >
      <header className="flex flex-col items-center gap-1.5 px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/55">
          mkxa
        </p>
        <h1 className="font-sans text-[24px] font-extrabold tracking-tightest text-white">
          ¿Quién entra?
        </h1>
      </header>

      <div
        ref={scrollerRef}
        className="mt-6 flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {ATHLETES.map((a) => (
          <div key={a} className="flex w-screen shrink-0 snap-center items-stretch justify-center px-4">
            <HeroCard athlete={a} onEnter={() => pickAndGo(a)} />
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-1.5">
        {ATHLETES.map((a, i) => (
          <span
            key={a}
            aria-hidden
            className={`h-1.5 rounded-full transition-all duration-200 ${i === index ? 'w-8 bg-white' : 'w-1.5 bg-white/25'}`}
          />
        ))}
      </div>
    </main>
  );
}

function HeroCard({ athlete, onEnter }: { athlete: Athlete; onEnter: () => void }) {
  const { profile } = useAthleteProfile(athlete);
  const { streak } = useWeekStreak(athlete);
  const accent = athlete === 'MK' ? '#ffa3bc' : '#a3bcff';
  const accentSoft = athlete === 'MK' ? 'rgba(255,163,188,0.20)' : 'rgba(163,188,255,0.20)';

  return (
    <button
      type="button"
      onClick={onEnter}
      aria-label={`Entrar como ${athlete}`}
      className="group relative flex w-full flex-1 flex-col items-center justify-center gap-7 overflow-hidden rounded-[40px] border border-white/10 px-6 py-10 text-left transition-transform duration-150 active:scale-[0.985]"
      style={{
        background: `radial-gradient(120% 70% at 50% 0%, ${accentSoft} 0%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0) 100%), linear-gradient(180deg, #131418 0%, #0e0f12 100%)`,
      }}
    >
      <span aria-hidden className="absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full opacity-55 blur-3xl" style={{ background: accent }} />

      <div className="relative">
        <span
          aria-hidden
          className="absolute inset-0 -m-3 rounded-full"
          style={{ boxShadow: `0 0 0 2px ${accent}, 0 0 64px 10px ${accentSoft}` }}
        />
        <AvatarCircle athlete={athlete} src={profile?.avatar_url ?? null} size={220} />
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
          atleta
        </p>
        <p className="font-sans text-[72px] font-extrabold leading-none tracking-tightest">
          {athlete}
        </p>
        <p className="flex items-center gap-1.5 text-[14px] font-bold text-white/75">
          <Flame size={15} strokeWidth={1.75} aria-hidden style={{ color: accent }} />
          {streak} sem.
        </p>
      </div>

      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-full px-7 py-3 text-[12px] font-extrabold uppercase tracking-[0.22em] text-[#0c0d10]"
        style={{ backgroundColor: accent }}
      >
        Entrar
      </span>
    </button>
  );
}
