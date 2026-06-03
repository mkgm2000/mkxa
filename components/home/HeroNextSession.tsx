'use client';

import Link from 'next/link';
import { ArrowUpRight, Flame } from 'lucide-react';
import { useAthlete } from '@/lib/athlete-context';
import { getCurrentWeek, getDays } from '@/lib/plan-hyrox';
import { useTraining } from '@/lib/hooks/use-training';

// Hero card under the KPI row — bigger than the prior CardNextSession,
// no MoodBlob illustration (felt out of context). Centered around the
// session title with a clear "Empezar ›" CTA. Tap = open the training tab.
export function HeroNextSession() {
  const athlete = useAthlete();
  const week = getCurrentWeek();
  const days = getDays(week, athlete);
  const { byKey } = useTraining(athlete, week);

  if (!athlete) return null;
  const next = days.find((d) => !byKey[d.key]?.completed) ?? days[0];
  if (!next) return null;

  return (
    <Link
      href="/training"
      className="mx-5 block rounded-card bg-white p-5 shadow-card transition-transform duration-150 active:scale-[0.99]"
    >
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        <Flame size={11} strokeWidth={1.75} aria-hidden />
        Próxima sesión
      </p>
      <h2 className="mt-2 font-sans text-[24px] font-extrabold leading-tight tracking-tightest text-ink">
        {next.title}
      </h2>
      <p className="mt-1 text-[12px] text-ink-muted">
        {next.key} · Semana {week} · {next.rpe}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[13px] font-bold text-ink">Empezar</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
          <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
        </span>
      </div>
    </Link>
  );
}
