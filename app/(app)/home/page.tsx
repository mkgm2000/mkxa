'use client';

import { GreetingHeader } from '@/components/home/GreetingHeader';
import { KpiRow } from '@/components/home/KpiRow';
import { HeroNextSession } from '@/components/home/HeroNextSession';
import { WidgetMoodChart } from '@/components/home/WidgetMoodChart';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { useAthlete } from '@/lib/athlete-context';
import { useMoodToday } from '@/lib/hooks/use-mood-today';
import { useMoodWeek } from '@/lib/hooks/use-mood-week';
import { todayISO } from '@/lib/date';

// Stats-dashboard layout (redesign option D, picked 2026-06-03):
//   greeting + mood badge
//   KPI strip (3 numbers, no chrome — sits on the mood gradient)
//   próxima sesión hero card with CTA
//   mood semana widget linked to /mood
export default function HomePage() {
  const athlete = useAthlete();
  const { mood } = useMoodToday(athlete);
  const { weekStartISO, logsByDate } = useMoodWeek(athlete);

  if (!athlete || !mood) return null;

  return (
    <main className="flex flex-col gap-5 pt-2">
      <GreetingHeader athlete={athlete} todayMood={mood.mood} />

      <div className="px-5"><InlineSaveText /></div>

      <KpiRow />

      <HeroNextSession />

      <section className="px-5">
        <WidgetMoodChart
          weekStartISO={weekStartISO}
          todayISO={todayISO()}
          logsByDate={logsByDate}
        />
      </section>
    </main>
  );
}
