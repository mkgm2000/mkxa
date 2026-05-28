import { describe, it, expect } from 'vitest';
import { todayISO, startOfWeekISO, weekDays } from '@/lib/date';

describe('date helpers', () => {
  it('todayISO returns YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('startOfWeekISO returns the Monday of a given date', () => {
    expect(startOfWeekISO(new Date('2026-05-13T10:00:00Z'))).toBe('2026-05-11');
    expect(startOfWeekISO(new Date('2026-05-11T10:00:00Z'))).toBe('2026-05-11');
    expect(startOfWeekISO(new Date('2026-05-17T10:00:00Z'))).toBe('2026-05-11');
  });

  it('weekDays returns 7 ISO dates starting Monday', () => {
    expect(weekDays('2026-05-11')).toEqual([
      '2026-05-11','2026-05-12','2026-05-13','2026-05-14',
      '2026-05-15','2026-05-16','2026-05-17',
    ]);
  });
});
