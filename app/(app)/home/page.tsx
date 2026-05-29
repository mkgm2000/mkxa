'use client';

import { useState } from 'react';
import { GreetingHeader } from '@/components/home/GreetingHeader';
import { WeekMoodDotsRow } from '@/components/home/WeekMoodDotsRow';
import { WidgetMoodChart } from '@/components/home/WidgetMoodChart';
import { WidgetExpenseMonth } from '@/components/home/WidgetExpenseMonth';
import { WidgetTrainingStreak } from '@/components/home/WidgetTrainingStreak';
import { CardNextSession } from '@/components/home/CardNextSession';
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

      <section className="grid grid-cols-2 gap-3 px-5">
        <WidgetMoodChart weekStartISO={weekStartISO} logsByDate={logsByDate} />
        <WidgetExpenseMonth />
      </section>

      <CardNextSession />
      <WidgetTrainingStreak />
    </main>
  );
}
