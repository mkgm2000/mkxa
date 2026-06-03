'use client';

import { useMemo } from 'react';
import { ArrowUpRight, Flame } from 'lucide-react';
import { GreetingHeader } from '@/components/home/GreetingHeader';
import { StickerCard } from '@/components/home/StickerCard';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { useAthlete } from '@/lib/athlete-context';
import { useMoodToday } from '@/lib/hooks/use-mood-today';
import { useMoodWeek } from '@/lib/hooks/use-mood-week';
import { useTrainingAll } from '@/lib/hooks/use-training-all';
import { useTraining } from '@/lib/hooks/use-training';
import { useExpenses } from '@/lib/hooks/use-expenses';
import { getCurrentWeek, getDays } from '@/lib/plan-hyrox';
import { getMoodTokens } from '@/lib/moods';
import { todayISO } from '@/lib/date';

const KEYS = ['D1', 'D2', 'D3', 'D4'] as const;
const DOW_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function monthRange(): { from: string; to: string; label: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);
  const label = now.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
  return { from, to, label };
}

// Sticker-collage layout (redesign option C, picked 2026-06-03):
// the page is the gradient canvas, each widget is a tilted "sticker"
// that visually feels pegged on. Slight rotations + a soft drop-shadow
// sell the hand-placed vibe while keeping the bold Mona Sans typography.
export default function HomePage() {
  const athlete = useAthlete();
  const { mood } = useMoodToday(athlete);
  const { weekStartISO, logsByDate } = useMoodWeek(athlete);

  const week = getCurrentWeek();
  const { rows } = useTrainingAll(athlete, week);
  const { byKey } = useTraining(athlete, week);

  const { from, to, label: monthLabel } = useMemo(monthRange, []);
  const { total: monthTotal } = useExpenses({ from, to });

  const totalSessions = useMemo(() => {
    let n = 0;
    for (const r of rows) for (const k of KEYS) if (r[k]?.completed) n++;
    return n;
  }, [rows]);

  const weekStats = useMemo(() => {
    if (!athlete) return { done: 0, total: 4, nextTitle: '—', nextKey: '', rpe: '' };
    const days = getDays(week, athlete);
    const done = days.filter((d) => byKey[d.key]?.completed).length;
    const next = days.find((d) => !byKey[d.key]?.completed) ?? days[0];
    return {
      done,
      total: days.length,
      nextTitle: next?.title ?? '—',
      nextKey: next?.key ?? '',
      rpe: next?.rpe ?? '',
    };
  }, [athlete, week, byKey]);

  if (!athlete || !mood) return null;

  const moodTokens = getMoodTokens(mood.mood);
  const eur = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(monthTotal || 0);
  const today = todayISO();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartISO);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <main className="flex flex-col gap-4 pt-2">
      <GreetingHeader athlete={athlete} todayMood={mood.mood} />

      <div className="px-5"><InlineSaveText /></div>

      {/* Mood + Expense — paired row */}
      <div className="flex flex-col gap-3 px-3">
        <StickerCard
          tilt={-3}
          align="left"
          href="/mood"
          ariaLabel="Ver historial de mood"
          style={{ width: '60%' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Mood hoy
          </p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span
              aria-hidden
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${moodTokens.cardFrom} 0%, ${moodTokens.cardTo} 100%)`,
                boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.08)',
              }}
            />
            <span className="font-sans text-[22px] font-extrabold leading-none text-ink">
              {moodTokens.label}
            </span>
          </div>
        </StickerCard>

        <StickerCard
          tilt={2}
          align="right"
          href="/expenses"
          ariaLabel="Ver gastos del mes"
          style={{ width: '46%' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            {monthLabel}
          </p>
          <p className="mt-1 font-sans text-[26px] font-extrabold leading-none tabular-nums text-ink">
            {eur}
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">gasto este mes</p>
        </StickerCard>
      </div>

      {/* Hero sticker — Próxima sesión, the largest, most centered */}
      <div className="px-3">
        <StickerCard
          tilt={-1}
          align="center"
          href="/training"
          ariaLabel="Ver plan de entreno"
          style={{ width: '94%' }}
          className="!max-w-none p-5"
        >
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            <Flame size={11} strokeWidth={1.75} aria-hidden />
            Próxima sesión
          </p>
          <h2 className="mt-2 font-sans text-[26px] font-extrabold leading-tight tracking-tightest text-ink">
            {weekStats.nextTitle}
          </h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            {weekStats.nextKey} · Semana {week} · {weekStats.rpe}
          </p>
          <div className="mt-3.5 flex items-center justify-between">
            <span className="text-[13px] font-bold text-ink">Empezar</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
              <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
            </span>
          </div>
        </StickerCard>
      </div>

      {/* Total sessions sticker — small, off-center */}
      <div className="px-3">
        <StickerCard
          tilt={4}
          align="right"
          href="/training/progress"
          ariaLabel="Ver progreso"
          style={{ width: '38%' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Total
          </p>
          <p className="mt-1 font-sans text-[30px] font-extrabold leading-none tabular-nums text-ink">
            {totalSessions}
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">sesiones</p>
        </StickerCard>
      </div>

      {/* Mood week sticker — wide-ish, tilted left */}
      <div className="px-3 pb-4">
        <StickerCard
          tilt={-2}
          align="center"
          href="/mood"
          ariaLabel="Ver mood semana"
          style={{ width: '88%' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Semana
          </p>
          <div className="mt-2.5 grid grid-cols-7 gap-1.5">
            {weekDays.map((iso, i) => {
              const m = logsByDate[iso];
              const t = m ? getMoodTokens(m) : null;
              const isToday = iso === today;
              return (
                <div key={iso} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-ink-muted">{DOW_LABELS[i]}</span>
                  <span
                    className="block aspect-square w-full"
                    style={{
                      borderRadius: 6,
                      background: t
                        ? `linear-gradient(135deg, ${t.cardFrom} 0%, ${t.cardTo} 100%)`
                        : 'rgba(27,29,31,0.06)',
                      boxShadow: isToday
                        ? '0 0 0 2px #1b1d1f, 0 0 0 4px rgba(255,255,255,0.95)'
                        : t
                          ? 'inset 0 -1px 2px rgba(0,0,0,0.06)'
                          : undefined,
                    }}
                    aria-label={t ? `${DOW_LABELS[i]} ${t.label}` : `${DOW_LABELS[i]} sin registro`}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">
            {weekStats.done} de {weekStats.total} sesiones completadas
          </p>
        </StickerCard>
      </div>
    </main>
  );
}
