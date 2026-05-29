'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { MoodBlob } from '@/components/mood/MoodBlob';
import { useAthlete } from '@/lib/athlete-context';
import { getCurrentWeek, getDays } from '@/lib/plan-hyrox';
import { useTraining } from '@/lib/hooks/use-training';

export function CardNextSession() {
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
      className="mx-5 flex items-center gap-4 rounded-card bg-white p-5 shadow-card transition-transform duration-150 active:scale-[0.99]"
    >
      <div className="-my-1 flex-shrink-0">
        <MoodBlob mood="joyful" size={72} animate={false} withFloor={false} withParticles={false} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Próxima sesión
        </p>
        <p className="mt-0.5 truncate font-sans text-[19px] font-extrabold text-ink">
          {next.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-muted">
          <Clock size={12} strokeWidth={1.5} aria-hidden />
          {next.key} · Semana {week} · {next.rpe}
        </p>
      </div>
    </Link>
  );
}
