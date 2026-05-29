'use client';

import { useState } from 'react';
import { MoodGradientBg } from '@/components/mood/MoodGradientBg';
import { AthleteCard } from '@/components/profile/AthleteCard';
import { MoodHistoryChart } from '@/components/profile/MoodHistoryChart';
import { ExploreCards } from '@/components/profile/ExploreCards';
import { useAthlete } from '@/lib/athlete-context';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import { todayISO } from '@/lib/date';

export default function ProfilePage() {
  const athlete = useAthlete();
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
    <MoodGradientBg mood="love">
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

        <section className="mx-5 mt-2 rounded-card bg-white p-5 shadow-card">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Ajustes</h2>
          <button
            type="button"
            onClick={resetMoodToday}
            disabled={resetting}
            className="mt-3 w-full rounded-action border border-ink-soft py-3 text-left text-[14px] font-medium text-ink disabled:opacity-40"
          >
            Reiniciar mood de hoy
          </button>
          <a
            href="/legacy/index.html"
            className="mt-2 block w-full rounded-action border border-ink-soft py-3 text-center text-[14px] font-medium text-ink-muted"
          >
            Abrir versión legacy
          </a>
        </section>
      </main>
    </MoodGradientBg>
  );
}
