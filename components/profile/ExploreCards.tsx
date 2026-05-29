import Link from 'next/link';
import { ArrowUpRight, Hourglass } from 'lucide-react';
import { MoodBlob } from '@/components/mood/MoodBlob';
import type { Mood } from '@/lib/moods';

interface Card {
  title: string;
  href: string;
  duration: string;
  mood: Mood;
}

const CARDS: Card[] = [
  { title: 'Balance del mes',  href: '/expenses',          duration: '5 min',  mood: 'joyful' },
  { title: 'Tu plan HYROX',    href: '/training',          duration: '15 min', mood: 'happy'  },
  { title: 'Progresión RPE',   href: '/training/progress', duration: '5 min',  mood: 'worried' },
  { title: 'Próxima compra',   href: '/meals',             duration: '10 min', mood: 'love'   },
];

export function ExploreCards() {
  return (
    <div className="grid grid-cols-2 gap-3 px-5">
      {CARDS.map((c) => (
        <Link key={c.title} href={c.href} className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card">
          <div className="self-end">
            <MoodBlob mood={c.mood} size={64} animate={false} withFloor={false} withParticles={false} />
          </div>
          <div>
            <p className="font-sans text-[15px] font-extrabold leading-tight text-ink">
              {c.title}
            </p>
            <div className="mt-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                <Hourglass size={11} strokeWidth={1.5} aria-hidden /> {c.duration}
              </span>
              <ArrowUpRight size={14} strokeWidth={1.5} className="text-ink-muted" aria-hidden />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
