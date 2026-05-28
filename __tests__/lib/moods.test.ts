import { describe, it, expect } from 'vitest';
import { MOODS, isMood, getMoodTokens } from '@/lib/moods';

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
