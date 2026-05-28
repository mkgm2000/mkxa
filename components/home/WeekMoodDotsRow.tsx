import clsx from 'clsx';
import { weekDays } from '@/lib/date';
import { getMoodTokens, type Mood } from '@/lib/moods';

const LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export interface WeekMoodDotsRowProps {
  weekStartISO: string;
  todayISO: string;
  logsByDate: Record<string, Mood>;
  className?: string;
}

export function WeekMoodDotsRow({
  weekStartISO,
  todayISO,
  logsByDate,
  className,
}: WeekMoodDotsRowProps) {
  const days = weekDays(weekStartISO);
  return (
    <div className={clsx('grid grid-cols-7 gap-2 px-2', className)}>
      {days.map((iso, i) => {
        const mood = logsByDate[iso];
        const isToday = iso === todayISO;
        const dayNum = Number(iso.slice(-2));
        const bg = mood ? getMoodTokens(mood).bodyMid : 'transparent';
        return (
          <div key={iso} className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-ink-muted">{LABELS[i]}</span>
            <div
              data-testid={`day-cell-${iso}`}
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold',
                mood ? 'text-white' : 'border border-ink-soft text-ink-muted',
                isToday && 'outline-none ring-2 ring-ink ring-offset-2 ring-offset-transparent'
              )}
              style={{ backgroundColor: bg }}
            >
              {dayNum}
            </div>
          </div>
        );
      })}
    </div>
  );
}
