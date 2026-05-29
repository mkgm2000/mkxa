import { describe, it, expect } from 'vitest';
import { MOODS, isMood, getMoodTokens, MOOD_ORDER } from '@/lib/moods';

describe('moods', () => {
  it('exposes the 10 moods in canonical order', () => {
    expect(MOODS).toEqual([
      'happy', 'joyful', 'annoyed', 'worried', 'dizzy',
      'sad', 'angry', 'love', 'sleepy', 'neutral',
    ]);
  });

  it('isMood narrows correctly', () => {
    expect(isMood('happy')).toBe(true);
    expect(isMood('nope')).toBe(false);
  });

  it('returns gradient tokens for every mood', () => {
    for (const m of MOODS) {
      const t = getMoodTokens(m);
      expect(t.cardFrom).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.cardTo).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('MOOD_ORDER', () => {
  it('has the 10 moods in the best→worst order picked by the user', () => {
    expect(MOOD_ORDER).toEqual([
      'joyful', 'happy', 'love', 'sleepy', 'neutral',
      'annoyed', 'worried', 'sad', 'angry', 'dizzy',
    ]);
  });

  it('contains every mood exactly once', () => {
    expect(new Set(MOOD_ORDER).size).toBe(10);
    for (const m of MOODS) expect(MOOD_ORDER).toContain(m);
  });
});
