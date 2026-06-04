/**
 * Adaptive training suggestion engine.
 *
 * Reads recent `registros` rows and surfaces a soft recommendation for the
 * next session. This module is **pure**: no DB, no React, no side effects —
 * easy to unit test in isolation.
 *
 * Decision tree (kept intentionally simple, see spec):
 *
 *  1. avg_rpe >= 8.5 AND last 3 completed sessions all RPE >= 8
 *       → kind "baja-intensidad"  (rebajar 1 punto)
 *  2. avg_rpe <= 5.5 AND completion_rate >= 0.8
 *       → kind "sube-intensidad"  (subir 1 punto)
 *  3. completion_rate < 0.5
 *       → kind "replantear-volumen" (recortar a 2-3 sesiones/semana)
 *  4. otherwise → null (no banner)
 *
 * Inputs are plain `RecentRegistro` rows (see lib/training/dynamic-context.ts).
 * The "last N" window is the last 6 completed registros, ordered by
 * (week, day_key) ascending. We then look at the trailing 3 for rule #1.
 *
 * `completion_rate` is computed over the last 2 weeks **before** the target
 * week, taking the maximum (`week`) present in the data as the reference. We
 * assume 4 sessions/week (`EXPECTED_DAYS_PER_WEEK`), matching the HYROX plan.
 */

import type { RecentRegistro } from '@/lib/training/dynamic-context';

export const EXPECTED_DAYS_PER_WEEK = 4;
export const RECENT_WINDOW = 6;

export type SuggestionKind =
  | 'baja-intensidad'
  | 'sube-intensidad'
  | 'replantear-volumen';

export interface AdaptiveSuggestion {
  kind: SuggestionKind;
  title: string;
  body: string;
  actionLabel: string;
  /** Debug fields — surfaced so callers can log/inspect. */
  metrics: {
    avgRpe: number | null;
    completionRate: number | null;
    sampleSize: number;
    lastThreeAllHigh: boolean;
  };
}

/**
 * Parse an RPE value coming from a registro or from a plan string.
 *
 * Registros store a number — we accept that directly. Plan-defined sessions
 * store strings like "RPE 6-7" (and tests in the spec assume `"5-6" → 5.5`),
 * so we also accept strings: we grab the first number; if a range is present
 * (`N-M`), we average both bounds.
 */
export function parseRpe(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const matches = value.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const nums = matches.map((s) => parseFloat(s)).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  if (nums.length === 1) return nums[0];
  // Range like "5-6" → midpoint.
  return (nums[0] + nums[1]) / 2;
}

/** Sort a list of registros chronologically by (week, day_key). */
function sortRegistros(rows: RecentRegistro[]): RecentRegistro[] {
  return rows.slice().sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;
    return a.day_key.localeCompare(b.day_key);
  });
}

/**
 * Compute the trailing-window metrics used by the decision tree.
 * Exported for tests and for the dev-mode logger in the hook.
 */
export function computeMetrics(rows: RecentRegistro[]): {
  avgRpe: number | null;
  completionRate: number | null;
  sampleSize: number;
  lastThreeAllHigh: boolean;
} {
  const sorted = sortRegistros(rows);
  const completedWithRpe = sorted.filter(
    (r) => r.completed === true && r.rpe != null,
  );
  const recent = completedWithRpe.slice(-RECENT_WINDOW);

  const parsedRpes = recent
    .map((r) => parseRpe(r.rpe))
    .filter((n): n is number => n != null);
  const avgRpe = parsedRpes.length > 0
    ? parsedRpes.reduce((a, b) => a + b, 0) / parsedRpes.length
    : null;

  // last 3 (chronologically) completed sessions ≥ 8
  const lastThree = parsedRpes.slice(-3);
  const lastThreeAllHigh = lastThree.length === 3 && lastThree.every((n) => n >= 8);

  // completion_rate over the last 2 weeks present in the data.
  let completionRate: number | null = null;
  const weeks = Array.from(new Set(sorted.map((r) => r.week))).sort((a, b) => a - b);
  if (weeks.length > 0) {
    const lastTwoWeeks = weeks.slice(-2);
    const planned = lastTwoWeeks.length * EXPECTED_DAYS_PER_WEEK;
    const completed = sorted
      .filter((r) => lastTwoWeeks.includes(r.week))
      .filter((r) => r.completed === true).length;
    completionRate = planned === 0 ? null : completed / planned;
  }

  return {
    avgRpe,
    completionRate,
    sampleSize: recent.length,
    lastThreeAllHigh,
  };
}

/**
 * Apply the decision tree. Returns `null` when no banner should show.
 * Requires at least 3 completed-with-rpe sessions in the window — anything
 * less is too noisy to recommend on.
 */
export function suggestAdaptive(rows: RecentRegistro[]): AdaptiveSuggestion | null {
  const metrics = computeMetrics(rows);
  const { avgRpe, completionRate, sampleSize, lastThreeAllHigh } = metrics;

  // Rule #3 can fire on volume alone; the other two need RPE signal.
  if (completionRate != null && completionRate < 0.5) {
    return {
      kind: 'replantear-volumen',
      title: 'Replantea el volumen',
      body:
        'Te has saltado más de la mitad de las sesiones. Igual hay que recortar a 2-3 sesiones/semana.',
      actionLabel: 'Ajustar plan',
      metrics,
    };
  }

  if (sampleSize < 3 || avgRpe == null) return null;

  if (avgRpe >= 8.5 && lastThreeAllHigh) {
    return {
      kind: 'baja-intensidad',
      title: 'Baja la intensidad',
      body:
        'Tus últimas sesiones están en RPE alto. La próxima podríamos rebajarla 1 punto para evitar overreaching.',
      actionLabel: 'Ajustar plan',
      metrics,
    };
  }

  if (avgRpe <= 5.5 && completionRate != null && completionRate >= 0.8) {
    return {
      kind: 'sube-intensidad',
      title: 'Puedes subir un punto',
      body:
        'Llevas varias sesiones cómodas. Puedes apretar 1 punto de RPE en la próxima.',
      actionLabel: 'Ajustar plan',
      metrics,
    };
  }

  return null;
}
