'use client';

import { useState } from 'react';
import { GreetingHeader } from '@/components/home/GreetingHeader';
import { WeekMoodDotsRow } from '@/components/home/WeekMoodDotsRow';
import { SegmentedDayWeekMonth, type Range } from '@/components/controls/SegmentedDayWeekMonth';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { useAthlete } from '@/lib/athlete-context';
import { useMoodToday } from '@/lib/hooks/use-mood-today';
import { useMoodWeek } from '@/lib/hooks/use-mood-week';
import { todayISO } from '@/lib/date';

export default function HomePage() {
  const athlete = useAthlete();
  const { mood } = useMoodToday(athlete);
  const { weekStartISO, logsByDate } = useMoodWeek(athlete);
  const [range, setRange] = useState<Range>('week');

  if (!athlete || !mood) return null;

  return (
    <main className="flex flex-col gap-5 px-1 pt-2">
      <GreetingHeader athlete={athlete} todayMood={mood.mood} />
      <div className="px-5"><InlineSaveText /></div>

      <div className="px-5">
        <SegmentedDayWeekMonth value={range} onChange={setRange} />
      </div>

      <section className="px-3">
        <WeekMoodDotsRow
          weekStartISO={weekStartISO}
          todayISO={todayISO()}
          logsByDate={logsByDate}
        />
      </section>

      <section className="mx-5 mt-2 rounded-card bg-white p-5 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          Próximo paso
        </p>
        <p className="mt-1 font-sans text-base font-bold text-ink">
          Las funciones de Training, Comidas y Gastos llegan en siguientes planes.
        </p>
      </section>
    </main>
  );
}
