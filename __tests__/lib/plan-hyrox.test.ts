import { describe, it, expect } from 'vitest';
import { PLAN, START_DATE, getCurrentWeek, getDays, getWeekDates, MAX_WEEK } from '@/lib/plan-hyrox';

describe('PLAN', () => {
  it('contains weeks 1..3 with MK + Xabi each', () => {
    for (const w of [1, 2, 3]) {
      expect(PLAN[w].MK).toHaveLength(4);
      expect(PLAN[w].Xabi).toHaveLength(4);
    }
  });

  it('day keys are D1..D4', () => {
    expect(PLAN[1].MK.map((d) => d.key)).toEqual(['D1', 'D2', 'D3', 'D4']);
  });

  it('exposes typed blocks', () => {
    const b = PLAN[1].MK[0].blocks[0];
    expect(b.name).toBe('Sentadilla');
    expect(b.sets).toBe('4x8');
    expect(b.load).toBe('30.0kg');
  });
});

describe('START_DATE', () => {
  it('is 2026-05-11 (UTC)', () => {
    expect(START_DATE.toISOString().slice(0, 10)).toBe('2026-05-11');
  });
});

describe('getCurrentWeek', () => {
  it('returns 1 on START_DATE', () => {
    expect(getCurrentWeek(new Date('2026-05-11T08:00:00Z'))).toBe(1);
  });
  it('returns 1 before START_DATE (clamped)', () => {
    expect(getCurrentWeek(new Date('2026-01-01'))).toBe(1);
  });
  it('returns 2 after 7 days', () => {
    expect(getCurrentWeek(new Date('2026-05-18T08:00:00Z'))).toBe(2);
  });
  it('returns 3 after 14 days', () => {
    expect(getCurrentWeek(new Date('2026-05-25T08:00:00Z'))).toBe(3);
  });
});

describe('getDays', () => {
  it('returns MK plan when athlete is MK', () => {
    expect(getDays(1, 'MK')).toBe(PLAN[1].MK);
  });
  it('returns Xabi plan when athlete is Xabi', () => {
    expect(getDays(2, 'Xabi')).toBe(PLAN[2].Xabi);
  });
  it('falls back to MK when athlete null', () => {
    expect(getDays(1, null)).toBe(PLAN[1].MK);
  });
  it('clamps unknown future weeks to MAX_WEEK', () => {
    expect(getDays(99, 'MK')).toBe(PLAN[MAX_WEEK].MK);
  });
});

describe('getWeekDates', () => {
  it('returns range string for week 1', () => {
    const s = getWeekDates(1);
    expect(s).toContain('–');
  });
});

import { getDays as getDaysOverride, type Day as OverrideDay } from '@/lib/plan-hyrox';

describe('getDays override', () => {
  it('returns the override when one is provided', () => {
    const ov: OverrideDay[] = [
      { key: 'D1', title: 'Custom', rpe: 'RPE X', blocks: [{ name: 'x', sets: '1x1', load: '1' }] },
    ];
    const out = getDaysOverride(1, 'MK', ov);
    expect(out).toBe(ov);
  });
});
