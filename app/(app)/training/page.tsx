'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ArrowUpRight } from 'lucide-react';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { WeekHeader } from '@/components/training/WeekHeader';
import { SessionCard } from '@/components/training/SessionCard';
import { RpeModal } from '@/components/training/RpeModal';
import { useAthlete } from '@/lib/athlete-context';
import { useTraining } from '@/lib/hooks/use-training';
import { useConfirmedWeek } from '@/lib/hooks/use-confirmed-week';
import { useMaxAvailableWeek } from '@/lib/hooks/use-available-weeks';
import { getCurrentWeek, getDays, getWeekDates, MAX_WEEK } from '@/lib/plan-hyrox';
import type { Day, DayKey } from '@/lib/plan-hyrox';

export default function TrainingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const athlete = useAthlete();
  // Highest week with content (baseline PLAN or confirmed in DB). Caps nav so
  // arrows don't take user to empty future weeks that just show stale fallback.
  const maxAvailableWeek = useMaxAvailableWeek(athlete);
  const currentWeek = useMemo(() => Math.min(getCurrentWeek(), MAX_WEEK), []);
  const initialWeek = useMemo(() => {
    const raw = searchParams.get('week');
    const n = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(n) && n >= 1 && n <= MAX_WEEK) return n;
    return Math.min(currentWeek, maxAvailableWeek);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [week, setWeek] = useState<number>(initialWeek);

  // If maxAvailableWeek loads and current week is beyond it, clamp down.
  useEffect(() => {
    if (week > maxAvailableWeek) setWeek(maxAvailableWeek);
  }, [maxAvailableWeek, week]);

  // Sync URL ?week= when user changes week via navigation
  useEffect(() => {
    const q = searchParams.get('week');
    const n = q ? parseInt(q, 10) : NaN;
    if (Number.isFinite(n) && n >= 1 && n <= MAX_WEEK && n !== week) {
      setWeek(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { byKey, setLog, setWeekNote } = useTraining(athlete, week);
  const { plan: confirmedPlan, refresh: refreshConfirmed } = useConfirmedWeek(athlete, week);

  // Force refetch when arriving from /training/adjust (the URL will have
  // ?week=N after confirm). Without this, useConfirmedWeek's [athlete, week]
  // effect wouldn't re-fire if the user was already viewing the same week.
  useEffect(() => {
    void refreshConfirmed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const days = useMemo(() => {
    // Strip rationale from confirmed plan to match the Day[] render contract.
    const override: Day[] | undefined = confirmedPlan
      ? confirmedPlan.days.map((day) => {
          // Strip rationale from confirmed plan to match the Day[] render contract.
          const { rationale: _rationale, ...rest } = day;
          void _rationale;
          return rest as Day;
        })
      : undefined;
    return getDays(week, athlete, override);
  }, [week, athlete, confirmedPlan]);
  const done = useMemo(() => days.filter((d) => byKey[d.key]?.completed).length, [days, byKey]);

  // RPE modal state
  const [modalDay, setModalDay] = useState<DayKey | null>(null);
  const [draftRpe, setDraftRpe] = useState<number | null>(null);
  const [draftNotes, setDraftNotes] = useState<string>('');

  function openModal(dk: DayKey) {
    setModalDay(dk);
    const log = byKey[dk];
    setDraftRpe(log?.rpe ?? null);
    setDraftNotes(log?.notes ?? '');
  }
  function closeModal() { setModalDay(null); }
  function saveModal() {
    if (!modalDay) return;
    void setLog(modalDay, { rpe: draftRpe, notes: draftNotes || null });
    setModalDay(null);
  }

  // Week note (debounced via simple effect)
  const [weekNoteDraft, setWeekNoteDraft] = useState<string>('');
  useEffect(() => {
    const wn = days[0] ? byKey[days[0].key]?.weekNote ?? '' : '';
    setWeekNoteDraft(wn);
  }, [week, athlete, byKey, days]);

  useEffect(() => {
    if (!athlete) return;
    const wn = days[0] ? byKey[days[0].key]?.weekNote ?? '' : '';
    if (weekNoteDraft === wn) return;
    const t = setTimeout(() => {
      void setWeekNote(weekNoteDraft, days.map((d) => d.key));
    }, 1500);
    return () => clearTimeout(t);
  }, [weekNoteDraft, athlete, byKey, days, setWeekNote]);

  if (!athlete) return null;

  const meta = `${getWeekDates(week)}`;
  const todayBadge = week === currentWeek;

  return (
    <main className="flex flex-col gap-5 pt-2 pb-12">
      <header className="flex items-start justify-between gap-4 px-5 pt-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Atleta: {athlete}
          </p>
          <h1 className="mt-1 font-sans text-[40px] font-extrabold leading-[1.02] tracking-tightest text-ink">
            Plan de entreno
          </h1>
          {todayBadge && (
            <p className="mt-2 text-[12px] text-ink-muted">
              Semana actual en curso
            </p>
          )}
        </div>
        <HeaderActionButton
          icon={ChevronLeft}
          label="Volver"
          onClick={() => router.push('/home')}
        />
      </header>

      <div className="px-5">
        <InlineSaveText />
      </div>

      <WeekHeader
        week={week}
        maxWeek={maxAvailableWeek}
        done={done}
        total={days.length}
        meta={meta}
        onPrev={() => setWeek((w) => Math.max(1, w - 1))}
        onNext={() => setWeek((w) => Math.min(maxAvailableWeek, w + 1))}
      />

      {confirmedPlan && (
        <div className="mx-5 rounded-card bg-ink/8 px-3 py-2 text-[12px] font-medium text-ink" style={{ background: 'rgba(27,29,31,0.06)' }}>
          Plan ajustado por Claude · S{week} v actualizada
        </div>
      )}

      <section className="flex flex-col gap-3 px-5">
        {days.map((day) => (
          <SessionCard
            key={day.key}
            day={day}
            log={byKey[day.key] ?? null}
            onCheck={() => {
              void setLog(day.key, { completed: true });
              setTimeout(() => openModal(day.key), 50);
            }}
            onUncheck={() => {
              void setLog(day.key, { completed: false, rpe: null, notes: null });
            }}
            onOpenRpe={() => openModal(day.key)}
            onSaveBlock={(i, b) => {
              const cur = byKey[day.key]?.customBlocks ?? {};
              void setLog(day.key, { customBlocks: { ...cur, [i]: b } });
            }}
            onAddExtra={(b) => {
              const cur = byKey[day.key]?.extraBlocks ?? [];
              void setLog(day.key, { extraBlocks: [...cur, b] });
            }}
            onSaveExtra={(i, b) => {
              const cur = byKey[day.key]?.extraBlocks ?? [];
              const next = [...cur];
              next[i] = b;
              void setLog(day.key, { extraBlocks: next });
            }}
            onDeleteExtra={(i) => {
              const cur = byKey[day.key]?.extraBlocks ?? [];
              const next = cur.filter((_, idx) => idx !== i);
              void setLog(day.key, { extraBlocks: next });
            }}
          />
        ))}
      </section>

      {(() => {
        const next = Math.min(23, Math.max(week + 1, getCurrentWeek() + 1));
        return (
          <Link
            href={`/training/adjust?week=${next}`}
            className="mx-4 my-3 flex items-center justify-center gap-2 rounded-action border border-ink-soft py-3 text-[14px] font-medium text-ink"
          >
            Ajustar próxima semana
          </Link>
        );
      })()}

      <section className="px-5">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Nota de la semana
          </span>
          <textarea
            value={weekNoteDraft}
            onChange={(e) => setWeekNoteDraft(e.target.value)}
            placeholder="¿Cómo te sentiste esta semana?"
            rows={3}
            className="mt-2 w-full resize-none rounded-item border border-ink-soft bg-white px-3 py-2.5 text-[13px] text-ink focus:border-ink focus:outline-none"
          />
        </label>
      </section>

      <section className="flex flex-wrap gap-2 px-5">
        <Link
          href="/training/progress"
          className="inline-flex items-center gap-1.5 rounded-action border border-ink-soft bg-white px-4 py-2.5 text-[13px] font-semibold text-ink shadow-action transition-transform duration-150 active:scale-95"
        >
          Ver progresión
          <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden />
        </Link>
        <Link
          href="/training/hyrox"
          className="inline-flex items-center gap-1.5 rounded-action px-4 py-2.5 text-[13px] font-bold text-ink shadow-action transition-transform duration-150 active:scale-95"
          style={{ background: '#FFE600' }}
        >
          Tabla HYROX
          <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden />
        </Link>
      </section>

      <RpeModal
        open={!!modalDay}
        dayKey={modalDay ?? ''}
        title={days.find((d) => d.key === modalDay)?.title ?? ''}
        rpe={draftRpe}
        notes={draftNotes}
        onSelectRpe={(n) => setDraftRpe(n)}
        onChangeNotes={(s) => setDraftNotes(s)}
        onSave={saveModal}
        onClose={closeModal}
      />
    </main>
  );
}
