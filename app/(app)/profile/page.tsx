'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RotateCcw, ExternalLink, ChevronRight, Download, Sparkles } from 'lucide-react';
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
  const [exporting, setExporting] = useState(false);

  function exportData() {
    // The server route streams the workbook as an attachment, so a plain
    // navigation is enough — the browser handles the file download. We flip
    // a short-lived state so the button shows feedback while the request
    // round-trips; the navigation itself replaces the page transition.
    setExporting(true);
    window.location.href = '/api/export';
    // Reset after a delay in case the user stays on the page (download
    // typically completes before this fires).
    window.setTimeout(() => setExporting(false), 4000);
  }

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

        <section className="mx-5">
          <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Resumen del año</h2>
          <Link
            href={`/recap?year=${new Date().getFullYear()}`}
            className="block overflow-hidden rounded-card shadow-card"
          >
            <div
              className="relative flex items-center gap-4 p-5"
              style={{ background: 'linear-gradient(135deg, #ffe2ec 0%, #ffa3bc 55%, #ff80a0 100%)' }}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm">
                <Sparkles size={26} strokeWidth={1.8} className="text-ink" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/70">mkxa recap</p>
                <p className="font-sans text-[22px] font-extrabold leading-tight tracking-tightest text-ink">
                  Vuestro {new Date().getFullYear()} en mkxa
                </p>
                <p className="mt-1 text-[12px] font-medium text-ink/70">Mood, recetas, training y más</p>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-ink" aria-hidden />
            </div>
          </Link>
        </section>

        <section>
          <h2 className="mb-2 px-5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Explorar</h2>
          <ExploreCards />
        </section>

        <section className="mx-5 mt-2">
          <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Backup</h2>
          <div className="rounded-card bg-white p-5 shadow-card">
            <p className="text-[15px] font-semibold text-ink">Exportar datos (Excel)</p>
            <p className="mt-1 text-[13px] text-ink-muted">Descarga todo tu historial en Excel.</p>
            <button
              type="button"
              onClick={exportData}
              disabled={exporting}
              className="mt-4 flex items-center gap-2 rounded-action bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-transform duration-150 active:scale-[0.99] disabled:opacity-60"
            >
              <Download size={16} strokeWidth={1.75} aria-hidden />
              <span>{exporting ? 'Generando…' : 'Exportar datos (Excel)'}</span>
            </button>
          </div>
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
