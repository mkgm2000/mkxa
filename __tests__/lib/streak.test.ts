import { describe, it, expect } from 'vitest';
import { computeWeekStreak } from '@/lib/streak';

describe('computeWeekStreak', () => {
  it('returns 0 when there are no rows', () => {
    expect(computeWeekStreak([], 5)).toBe(0);
  });

  it('counts the current week alone', () => {
    expect(computeWeekStreak(
      [{ week: 5, day_key: 'D1', completed: true }],
      5,
    )).toBe(1);
  });

  it('does not count an uncompleted row', () => {
    expect(computeWeekStreak(
      [{ week: 5, day_key: 'D1', completed: false }],
      5,
    )).toBe(0);
  });

  it('returns 0 when the current week has nothing even if past weeks do', () => {
    expect(computeWeekStreak(
      [{ week: 3, day_key: 'D1', completed: true }],
      5,
    )).toBe(0);
  });

  it('counts consecutive weeks back from current', () => {
    expect(computeWeekStreak(
      [
        { week: 5, day_key: 'D1', completed: true },
        { week: 4, day_key: 'D2', completed: true },
        { week: 3, day_key: 'D1', completed: true },
      ],
      5,
    )).toBe(3);
  });

  it('breaks at a missing week in the middle', () => {
    expect(computeWeekStreak(
      [
        { week: 5, day_key: 'D1', completed: true },
        { week: 3, day_key: 'D1', completed: true },
      ],
      5,
    )).toBe(1);
  });

  it('treats a week with at least one completed row as a hit', () => {
    expect(computeWeekStreak(
      [
        { week: 5, day_key: 'D1', completed: false },
        { week: 5, day_key: 'D2', completed: true },
      ],
      5,
    )).toBe(1);
  });
});
