'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';
import { useAthlete } from '@/lib/athlete-context';
import { useTrainingAll } from '@/lib/hooks/use-training-all';
import { getCurrentWeek, MAX_WEEK, type DayKey } from '@/lib/plan-hyrox';

const DAYS: readonly DayKey[] = ['D1', 'D2', 'D3', 'D4'] as const;
const MAX_WEEKS_VISIBLE = 8;

interface RpeBucket {
  bg: string;
  border: string;
  text: string;
  label: string;
}

// Color buckets aligned with the app's mood palette.
function bucketFor(rpe: number | null): RpeBucket | null {
  if (rpe == null) return null;
  if (rpe <= 4) {
    // Soft green — low intensity (mood-joyful)
    return { bg: '#d6f5ea', border: '#8de2c9', text: '#1b1d1f', label: 'RPE 1-4 · suave' };
  }
  if (rpe <= 6) {
    // Soft amber — target zone (mood-worried)
    return { bg: '#fff1d6', border: '#ffd07a', text: '#1b1d1f', label: 'RPE 5-6 · objetivo' };
  }
  if (rpe <= 8) {
    // Soft orange — high (mood-happy)
    return { bg: '#fff4d8', border: '#ffb74d', text: '#1b1d1f', label: 'RPE 7-8 · alta' };
  }
  // Soft red — max (mood-angry / dizzy)
  return { bg: '#ffdcdc', border: '#ff7e7e', text: '#1b1d1f', label: 'RPE 9-10 · máxima' };
}

const LEGEND: { swatch: string; border: string; label: string }[] = [
  { swatch: '#d6f5ea', border: '#8de2c9', label: '1-4 suave' },
  { swatch: '#fff1d6', border: '#ffd07a', label: '5-6 objetivo' },
  { swatch: '#fff4d8', border: '#ffb74d', label: '7-8 alta' },
  { swatch: '#ffdcdc', border: '#ff7e7e', label: '9-10 máx' },
];

export default function TrainingProgressPage() {
  const router = useRouter();
  const athlete = useAthlete();
  const currentWeek = useMemo(() => Math.min(getCurrentWeek(), MAX_WEEK), []);
  const { rows, loading } = useTrainingAll(athlete, currentWeek);

  // Clip to the most recent N weeks for a wider trend view.
  const visibleRows = useMemo(
    () => rows.slice(-MAX_WEEKS_VISIBLE),
    [rows],
  );

  const { avgRpe, sampleCount } = useMemo(() => {
    let sum = 0;
    let n = 0;
    for (const r of visibleRows) {
      for (const d of DAYS) {
        const c = r[d];
        if (c && c.completed && c.rpe != null) {
          sum += c.rpe;
          n += 1;
        }
      }
    }
    return { avgRpe: n > 0 ? sum / n : null, sampleCount: n };
  }, [visibleRows]);

  if (!athlete) return null;

  const weekCount = visibleRows.length;
  // Up to 6 columns share fluid width on 360px; more weeks scroll horizontally.
  const fluidColumns = Math.min(weekCount, 6);
  const gridTemplate =
    weekCount <= 6
      ? `40px repeat(${fluidColumns}, minmax(0, 1fr))`
      : `40px repeat(${weekCount}, 56px)`;

  return (
    <main className="flex flex-col gap-5 pt-2 pb-12">
      <header className="flex items-start justify-between gap-4 px-5 pt-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Atleta: {athlete}
          </p>
          <h1 className="mt-1 font-sans text-[40px] font-extrabold leading-[1.02] tracking-tightest text-ink">
            Progresión
          </h1>
          <p className="mt-2 text-[12px] text-ink-muted">
            {weekCount} semana{weekCount === 1 ? '' : 's'} · RPE por sesión
          </p>
        </div>
        <HeaderActionButton
          icon={ChevronLeft}
          label="Volver"
          onClick={() => router.push('/training')}
        />
      </header>

      <section className="px-5">
        {loading ? (
          <p className="text-[13px] text-ink-muted">Cargando…</p>
        ) : weekCount === 0 ? (
          <div className="rounded-card bg-white p-6 shadow-card">
            <p className="text-[13px] text-ink-muted">
              Sin datos todavía. Completa una sesión para ver tu progresión.
            </p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-md rounded-card bg-white p-5 shadow-card">
            {/* Matrix */}
            <div className="overflow-x-auto">
              <div
                className="grid gap-2 font-sans"
                style={{ gridTemplateColumns: gridTemplate }}
                role="grid"
                aria-label="Matriz de RPE por semana y día"
              >
                {/* Header row: empty corner + week labels */}
                <div
                  aria-hidden
                  className="sticky left-0 z-10 bg-white"
                  style={{ width: 40 }}
                />
                {visibleRows.map((r) => (
                  <div
                    key={`h-${r.week}`}
                    className="flex h-6 items-center justify-center text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted"
                  >
                    S{r.week}
                  </div>
                ))}

                {/* Body rows */}
                {DAYS.map((day) => (
                  <FragmentRow
                    key={day}
                    day={day}
                    rows={visibleRows}
                  />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              {LEGEND.map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-3 w-3 rounded-[4px] border"
                    style={{ background: l.swatch, borderColor: l.border }}
                  />
                  <span className="text-[10px] font-medium text-ink-muted">
                    {l.label}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 rounded-[4px] bg-ink-soft/30"
                />
                <span className="text-[10px] font-medium text-ink-muted">
                  sin datos
                </span>
              </div>
            </div>

            {/* Summary */}
            <p className="mt-4 text-center text-[12px] text-ink-muted">
              {avgRpe != null ? (
                <>
                  RPE medio:{' '}
                  <span className="font-bold text-ink">
                    {avgRpe.toFixed(1)}
                  </span>{' '}
                  <span className="text-ink-muted">
                    · {sampleCount} sesion{sampleCount === 1 ? '' : 'es'}
                  </span>
                </>
              ) : (
                'Aún no hay sesiones completadas con RPE.'
              )}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

interface FragmentRowProps {
  day: DayKey;
  rows: ReturnType<typeof useTrainingAll>['rows'];
}

function FragmentRow({ day, rows }: FragmentRowProps) {
  return (
    <>
      {/* Sticky day-key column */}
      <div
        className="sticky left-0 z-10 flex h-[52px] items-center justify-end bg-white pr-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted"
        role="rowheader"
      >
        {day}
      </div>
      {rows.map((r) => {
        const cell = r[day];
        const rpe = cell?.rpe ?? null;
        const completed = !!cell?.completed;
        const bucket = bucketFor(completed ? rpe : null);
        const ariaLabel =
          rpe != null && completed
            ? `S${r.week} ${day} RPE ${rpe}`
            : completed
            ? `S${r.week} ${day} completada sin RPE`
            : `S${r.week} ${day} sin datos`;

        return (
          <div
            key={`${r.week}-${day}`}
            role="gridcell"
            aria-label={ariaLabel}
            className="flex h-[52px] items-center justify-center rounded-[12px] border text-[20px] font-extrabold leading-none"
            style={{
              background: bucket ? bucket.bg : 'rgba(27,29,31,0.06)',
              borderColor: bucket ? bucket.border : 'rgba(27,29,31,0.10)',
              color: bucket ? bucket.text : 'rgba(27,29,31,0.35)',
            }}
          >
            {rpe != null && completed ? (
              rpe
            ) : (
              <span aria-hidden className="text-[18px]">
                ·
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
