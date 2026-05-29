'use client';

import { useState } from 'react';
import { RotateCcw, ExternalLink, ChevronRight } from 'lucide-react';
import { MoodGradientBg } from '@/components/mood/MoodGradientBg';
import { AthleteCard } from '@/components/profile/AthleteCard';
import { MoodHistoryChart } from '@/components/profile/MoodHistoryChart';
import { ExploreCards } from '@/components/profile/ExploreCards';
import { useAthlete } from '@/lib/athlete-context';
import { useMoodToday } from '@/lib/hooks/use-mood-today';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import { todayISO } from '@/lib/date';

export default function ProfilePage() {
  const athlete = useAthlete();
  const { mood } = useMoodToday(athlete);
  const [resetting, setResetting] = useState(false);

  async function resetMoodToday() {
    if (!athlete) return;
    if (!confirm('¿Reiniciar el mood de hoy? Tendrás que registrarlo de nuevo al abrir la app.')) return;
    setResetting(true);
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('mood_logs')
      .delete()
      .match({ athlete, date: todayISO() });
    setResetting(false);
    if (error) saveState.getState().set('error');
    else { saveState.getState().set('saved'); window.location.href = '/home'; }
  }

  if (!athlete) return null;

  return (
    <MoodGradientBg mood={mood?.mood ?? 'love'}>
      <main className="flex flex-col gap-5 pt-2 pb-6">
        <header className="px-5 pt-6">
          <h1 className="font-sans text-[36px] font-extrabold leading-[1.05] tracking-tightest text-ink">
            Perfil
          </h1>
        </header>

        <AthleteCard athlete={athlete} />

        <section>
          <h2 className="mb-2 px-5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Tu ánimo</h2>
          <MoodHistoryChart athlete={athlete} />
        </section>

        <section>
          <h2 className="mb-2 px-5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Explorar</h2>
          <ExploreCards />
        </section>

        <section className="mx-5 mt-2">
          <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Ajustes</h2>
          <div className="overflow-hidden rounded-card bg-white shadow-card">
            <button
              type="button"
              onClick={resetMoodToday}
              disabled={resetting}
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-transform duration-150 active:scale-[0.99] disabled:opacity-40"
            >
              <RotateCcw size={18} strokeWidth={1.5} className="text-danger" aria-hidden />
              <span className="flex-1 text-[14px] font-medium text-danger">Reiniciar mood de hoy</span>
              <ChevronRight size={14} strokeWidth={1.5} className="text-ink-muted" aria-hidden />
            </button>
            <div className="mx-4 h-px bg-ink-soft" aria-hidden />
            <a
              href="/legacy/index.html"
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-transform duration-150 active:scale-[0.99]"
            >
              <ExternalLink size={18} strokeWidth={1.5} className="text-ink" aria-hidden />
              <span className="flex-1 text-[14px] font-medium text-ink">Abrir versión legacy</span>
              <ChevronRight size={14} strokeWidth={1.5} className="text-ink-muted" aria-hidden />
            </a>
          </div>
        </section>
      </main>
    </MoodGradientBg>
  );
}
