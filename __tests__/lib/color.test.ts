import { describe, it, expect } from 'vitest';
import { lerpHex } from '@/lib/color';

describe('lerpHex', () => {
  it('returns a at t=0', () => {
    expect(lerpHex('#000000', '#ffffff', 0)).toBe('#000000');
  });
  it('returns b at t=1', () => {
    expect(lerpHex('#000000', '#ffffff', 1)).toBe('#ffffff');
  });
  it('returns the midpoint at t=0.5', () => {
    expect(lerpHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
  it('interpolates each channel independently', () => {
    expect(lerpHex('#ff0000', '#00ff00', 0.5)).toBe('#808000');
  });
  it('clamps t below 0', () => {
    expect(lerpHex('#102030', '#a0b0c0', -0.5)).toBe('#102030');
  });
  it('clamps t above 1', () => {
    expect(lerpHex('#102030', '#a0b0c0', 2)).toBe('#a0b0c0');
  });
  it('handles mixed case input case-insensitively and returns lowercase', () => {
    expect(lerpHex('#FF8800', '#00ff00', 0)).toBe('#ff8800');
  });
});
