import { describe, it, expect } from 'vitest';
import { RC, rpeColor } from '@/lib/training-colors';

describe('RC map', () => {
  it('has 10 entries from RPE 1 to 10', () => {
    for (let i = 1; i <= 10; i++) {
      expect(RC[i]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('matches legacy hexes for boundary values', () => {
    expect(RC[1]).toBe('#22c55e');
    expect(RC[5]).toBe('#eab308');
    expect(RC[10]).toBe('#991b1b');
  });
});

describe('rpeColor', () => {
  it('returns null for null/undefined', () => {
    expect(rpeColor(null)).toBeNull();
    expect(rpeColor(undefined)).toBeNull();
  });
  it('returns hex for valid RPE', () => {
    expect(rpeColor(7)).toBe('#f97316');
  });
  it('returns null for out-of-range', () => {
    expect(rpeColor(0)).toBeNull();
    expect(rpeColor(11)).toBeNull();
  });
});
