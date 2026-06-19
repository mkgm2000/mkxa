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
import { AdaptiveBanner } from '@/components/training/AdaptiveBanner';
import { DayAssignmentSheet } from '@/components/training/DayAssignmentSheet';
import { useAthlete } from '@/lib/athlete-context';
import { useTraining } from '@/lib/hooks/use-training';
import { useConfirmedWeek } from '@/lib/hooks/use-confirmed-week';
import { useMaxAvailableWeek } from '@/lib/hooks/use-available-weeks';
import { useAdaptiveSuggestion } from '@/lib/hooks/use-adaptive-suggestion';
import {
  DEFAULT_DOW,
  dowDateLabel,
  getCurrentWeek,
  getDays,
  getDaysRemainingInWeek,
  getWeekDates,
  MAX_WEEK,
} from '@/lib/plan-hyrox';
import type { Day, DayKey } from '@/lib/plan-hyrox';

export default function TrainingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const athlete = useAthlete();
  // Highest week with content (baseline PLAN or confirmed in DB). Caps nav so
  // arrows don't take user to empty future weeks that just show stale fallback.
  const maxAvailableWeek = useMaxAvailableWeek(athlete);
  const currentWeek = useMemo(() => Math.min(getCurrentWeek(), MAX_WEEK), []);
  // userIntent = the week the user actively picked (URL ?week= or arrow nav).
  // When null, we follow `maxAvailableWeek` as the source of truth — that way
  // when the DB query upgrades the cap from baseline (3) to confirmed (4, 5…)
  // the page tracks the latest week automatically, with no stale state.
  // A previous fix tried to seed state from null → maxAvailable in an effect,
  // but only fired ONCE while max was 3, leaving the page pinned at 3 forever.
  const initialIntent = useMemo<number | null>(() => {
    const raw = searchParams.get('week');
    const n = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(n) && n >= 1 && n <= MAX_WEEK) return n;
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [userIntent, setUserIntent] = useState<number | null>(initialIntent);

  // Derived week — defaults to the CURRENT calendar week of the macrociclo
  // (capped at whatever's available in DB). Previously defaulted to the
  // HIGHEST confirmed week, so a user who'd already confirmed S8 would
  // land on S8 in mid-June instead of S6 (the week they're actually
  // training). Manual nav still overrides via userIntent.
  const week = userIntent ?? Math.min(currentWeek, Math.max(1, maxAvailableWeek));

  // If the user navigated to a week beyond what's now available, walk them
  // back to the latest. (Keeps `userIntent` itself null if they hadn't pinned.)
  useEffect(() => {
    if (userIntent !== null && userIntent > maxAvailableWeek) {
      setUserIntent(maxAvailableWeek);
    }
  }, [maxAvailableWeek, userIntent]);

  // Sync URL ?week= changes (e.g. arriving from /training/adjust with a new
  // confirmation) into userIntent.
  useEffect(() => {
    const q = searchParams.get('week');
    const n = q ? parseInt(q, 10) : NaN;
    if (Number.isFinite(n) && n >= 1 && n <= MAX_WEEK && n !== userIntent) {
      setUserIntent(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Setter used by arrow handlers — stays a "user-pinned" signal.
  const setWeek = setUserIntent;
  // Keep the legacy alias because the rest of the component already reads
  // `effectiveWeek`; both point to the same derived value.
  const effectiveWeek = week;

  const { byKey, setLog, setWeekNote } = useTraining(athlete, effectiveWeek);
  const { plan: confirmedPlan, refresh: refreshConfirmed } = useConfirmedWeek(athlete, effectiveWeek);
  // Adaptive suggestion based on historical registros (RPE + completion rate).
  const { suggestion: adaptiveSuggestion } = useAdaptiveSuggestion(athlete, effectiveWeek);

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
    return getDays(effectiveWeek, athlete, override);
  }, [effectiveWeek, athlete, confirmedPlan]);
  // Effective weekday per session for THIS athlete:
  //   personal override > shared > DEFAULT_DOW from plan-hyrox.
  // `dowSharedByKey` tracks the shared value too, so the picker can
  // tell when a session is on a personal day apart from the partner.
  const dowByKey = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of days) {
      const log = byKey[d.key];
      m[d.key] = log?.assignedDowPersonal ?? log?.assignedDow ?? DEFAULT_DOW[d.key];
    }
    return m;
  }, [days, byKey]);
  const dowSharedByKey = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of days) {
      m[d.key] = byKey[d.key]?.assignedDow ?? DEFAULT_DOW[d.key];
    }
    return m;
  }, [days, byKey]);
  const isPersonalByKey = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const d of days) m[d.key] = byKey[d.key]?.assignedDowPersonal != null;
    return m;
  }, [days, byKey]);

  const orderedDays = useMemo(() => {
    return [...days].sort((a, b) => {
      const da = dowByKey[a.key];
      const db = dowByKey[b.key];
      if (da !== db) return da - db;
      return a.key.localeCompare(b.key);
    });
  }, [days, dowByKey]);

  const done = useMemo(() => orderedDays.filter((d) => byKey[d.key]?.completed).length, [orderedDays, byKey]);

  // Day-assignment sheet state
  const [pickDayKey, setPickDayKey] = useState<DayKey | null>(null);

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
  }, [effectiveWeek, athlete, byKey, days]);

  useEffect(() => {
    if (!athlete) return;
    const wn = days[0] ? byKey[days[0].key]?.weekNote ?? '' : '';
    if (weekNoteDraft === wn) return;
    const t = setTimeout(() => {
      void setWeekNote(weekNoteDraft, days.map((d) => d.key));
    }, 1500);
    return () => clearTimeout(t);
  }, [weekNoteDraft, athlete, byKey, days, setWeekNote]);

  const daysRemaining = useMemo(() => getDaysRemainingInWeek(), []);

  if (!athlete) return null;

  const meta = `${getWeekDates(effectiveWeek)}`;

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

      <AdaptiveBanner suggestion={adaptiveSuggestion} week={effectiveWeek} />

      <WeekHeader
        week={effectiveWeek}
        maxWeek={maxAvailableWeek}
        done={done}
        total={days.length}
        meta={meta}
        currentWeek={currentWeek}
        daysRemaining={daysRemaining}
        onJumpToCurrent={() => setWeek(currentWeek)}
        onPrev={() => setWeek((w) => Math.max(1, (w ?? maxAvailableWeek) - 1))}
        onNext={() => setWeek((w) => Math.min(maxAvailableWeek, (w ?? maxAvailableWeek) + 1))}
      />

      {confirmedPlan && (
        <div className="mx-5 rounded-card bg-ink/8 px-3 py-2 text-[12px] font-medium text-ink" style={{ background: 'rgba(27,29,31,0.06)' }}>
          Plan ajustado por Claude · S{effectiveWeek} v actualizada
        </div>
      )}

      <section className="flex flex-col gap-3 px-5">
        {orderedDays.map((day) => (
          <SessionCard
            key={day.key}
            day={day}
            log={byKey[day.key] ?? null}
            dayLabel={dowDateLabel(effectiveWeek, dowByKey[day.key])}
            dayIsPersonal={isPersonalByKey[day.key]}
            onPickDay={() => setPickDayKey(day.key)}
            onCheck={() => {
              void setLog(day.key, { completed: true });
              setTimeout(() => openModal(day.key), 50);
            }}
            onUncheck={() => {
              // Only flip the completed flag — keep RPE and sensaciones
              // in the row. Notes are shared between athletes, so wiping
              // them on uncheck used to destroy the other athlete's
              // sensations too. RPE stays because if you re-check the
              // day it's almost always the same one.
              void setLog(day.key, { completed: false });
            }}
            onOpenRpe={() => openModal(day.key)}
            onSaveBlock={(i, b) => {
              const cur = byKey[day.key]?.customBlocks ?? {};
              void setLog(day.key, { customBlocks: { ...cur, [i]: b } });
            }}
            onDeleteBaseBlock={(i) => {
              const cur = byKey[day.key]?.deletedBlocks ?? [];
              if (cur.includes(i)) return;
              void setLog(day.key, { deletedBlocks: [...cur, i].sort((a, b) => a - b) });
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
        const next = Math.min(23, Math.max(effectiveWeek + 1, getCurrentWeek() + 1));
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

      {(() => {
        if (!pickDayKey) return null;
        const target = orderedDays.find((d) => d.key === pickDayKey);
        if (!target) return null;
        const taken: Record<number, DayKey> = {};
        for (const d of orderedDays) {
          if (d.key === pickDayKey) continue;
          taken[dowByKey[d.key]] = d.key;
        }
        const currentDow = dowByKey[pickDayKey];
        const sharedDow = dowSharedByKey[pickDayKey];
        const isPersonal = isPersonalByKey[pickDayKey];
        return (
          <DayAssignmentSheet
            open
            week={effectiveWeek}
            dayKey={pickDayKey}
            title={target.title}
            currentDow={currentDow}
            sharedDow={sharedDow}
            isPersonal={isPersonal}
            athlete={athlete}
            taken={taken}
            onClose={() => setPickDayKey(null)}
            onClearPersonal={() => {
              void setLog(pickDayKey, { assignedDowPersonal: null });
            }}
            onPick={(dow, scope) => {
              if (dow === currentDow && scope === (isPersonal ? 'personal' : 'shared')) {
                setPickDayKey(null);
                return;
              }
              if (scope === 'shared') {
                // Move both athletes' day. setLog with assignedDow mirrors
                // to partner. Clear THIS athlete's personal override so the
                // shared value takes effect immediately.
                void setLog(pickDayKey, {
                  assignedDow: dow,
                  assignedDowPersonal: null,
                });
              } else {
                // Only this athlete's day moves. Personal override doesn't
                // mirror — partner keeps the shared value.
                void setLog(pickDayKey, { assignedDowPersonal: dow });
              }
              setPickDayKey(null);
            }}
          />
        );
      })()}
    </main>
  );
}
