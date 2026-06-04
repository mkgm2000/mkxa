import { describe, it, expect } from 'vitest';
import { parseRpe, computeMetrics, suggestAdaptive } from '@/lib/training/adaptive';
import type { RecentRegistro } from '@/lib/training/dynamic-context';

function r(
  week: number,
  day_key: string,
  completed: boolean,
  rpe: number | null,
): RecentRegistro {
  return { week, day_key, completed, rpe, notes: null, week_note: null };
}

describe('parseRpe', () => {
  it('returns null for null/undefined/empty', () => {
    expect(parseRpe(null)).toBeNull();
    expect(parseRpe(undefined)).toBeNull();
    expect(parseRpe('')).toBeNull();
  });

  it('returns the number directly', () => {
    expect(parseRpe(7)).toBe(7);
    expect(parseRpe(5.5)).toBe(5.5);
  });

  it('parses a single RPE string', () => {
    expect(parseRpe('RPE 7')).toBe(7);
  });

  it('averages a range string', () => {
    expect(parseRpe('RPE 5-6')).toBe(5.5);
    expect(parseRpe('5-6')).toBe(5.5);
  });
});

describe('computeMetrics', () => {
  it('returns nulls for an empty input', () => {
    const m = computeMetrics([]);
    expect(m.avgRpe).toBeNull();
    expect(m.completionRate).toBeNull();
    expect(m.sampleSize).toBe(0);
    expect(m.lastThreeAllHigh).toBe(false);
  });

  it('averages RPE across the last 6 completed sessions', () => {
    const rows: RecentRegistro[] = [
      r(1, 'D1', true, 5),
      r(1, 'D2', true, 6),
      r(2, 'D1', true, 7),
      r(2, 'D2', true, 8),
    ];
    const m = computeMetrics(rows);
    expect(m.avgRpe).toBe((5 + 6 + 7 + 8) / 4);
    expect(m.sampleSize).toBe(4);
  });

  it('completion_rate uses last 2 weeks present', () => {
    // Week 1: 4/4. Week 2: 2/4. → 6/8 = 0.75
    const rows: RecentRegistro[] = [
      r(1, 'D1', true, 6),
      r(1, 'D2', true, 6),
      r(1, 'D3', true, 6),
      r(1, 'D4', true, 6),
      r(2, 'D1', true, 6),
      r(2, 'D2', true, 6),
      r(2, 'D3', false, null),
      r(2, 'D4', false, null),
    ];
    const m = computeMetrics(rows);
    expect(m.completionRate).toBeCloseTo(0.75, 5);
  });

  it('lastThreeAllHigh requires the last three completed RPE >=8', () => {
    const rows: RecentRegistro[] = [
      r(1, 'D1', true, 6),
      r(1, 'D2', true, 8),
      r(2, 'D1', true, 9),
      r(2, 'D2', true, 8.5),
    ];
    const m = computeMetrics(rows);
    expect(m.lastThreeAllHigh).toBe(true);
  });
});

describe('suggestAdaptive', () => {
  it('returns null with no data', () => {
    expect(suggestAdaptive([])).toBeNull();
  });

  it('returns null when sample is too small for an RPE-based rule', () => {
    // Only 1 row but it's a fully-completed week → no rule fires.
    const rows: RecentRegistro[] = [
      r(1, 'D1', true, 7),
      r(1, 'D2', true, 7),
      r(1, 'D3', false, null),
      r(1, 'D4', false, null),
    ];
    // completion_rate = 0.5 → rule 3 won't fire ("<0.5"), sampleSize=2 → rules 1/2 won't fire.
    expect(suggestAdaptive(rows)).toBeNull();
  });

  it('rule 1 → baja-intensidad when avg_rpe >= 8.5 AND last 3 RPE >= 8', () => {
    const rows: RecentRegistro[] = [
      r(1, 'D1', true, 8),
      r(1, 'D2', true, 9),
      r(2, 'D1', true, 9),
      r(2, 'D2', true, 9),
    ];
    const s = suggestAdaptive(rows);
    expect(s?.kind).toBe('baja-intensidad');
  });

  it('rule 2 → sube-intensidad when avg_rpe <= 5.5 AND completion_rate >= 0.8', () => {
    // Two full weeks, all completed, avg RPE 5.
    const rows: RecentRegistro[] = [
      r(1, 'D1', true, 5),
      r(1, 'D2', true, 5),
      r(1, 'D3', true, 5),
      r(1, 'D4', true, 5),
      r(2, 'D1', true, 5),
      r(2, 'D2', true, 5),
      r(2, 'D3', true, 5),
      r(2, 'D4', true, 5),
    ];
    const s = suggestAdaptive(rows);
    expect(s?.kind).toBe('sube-intensidad');
  });

  it('rule 3 → replantear-volumen wins over RPE rules when completion <0.5', () => {
    // 1 of 8 sessions completed → 0.125.
    const rows: RecentRegistro[] = [
      r(1, 'D1', true, 9),
      r(1, 'D2', false, null),
      r(1, 'D3', false, null),
      r(1, 'D4', false, null),
      r(2, 'D1', false, null),
      r(2, 'D2', false, null),
      r(2, 'D3', false, null),
      r(2, 'D4', false, null),
    ];
    const s = suggestAdaptive(rows);
    expect(s?.kind).toBe('replantear-volumen');
  });

  it('rule 4 → null for "normal" weeks', () => {
    const rows: RecentRegistro[] = [
      r(1, 'D1', true, 6),
      r(1, 'D2', true, 7),
      r(2, 'D1', true, 6),
      r(2, 'D2', true, 7),
    ];
    expect(suggestAdaptive(rows)).toBeNull();
  });
});
