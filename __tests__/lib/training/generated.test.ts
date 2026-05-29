import { describe, it, expect } from 'vitest';
import { GeneratedWeek, GeneratedDay, GeneratedBlock } from '@/lib/training/generated';

const validBlock = { name: 'Sentadilla', sets: '4x5', load: '32.5kg' };
const validDay = {
  key: 'D1', title: 'Fuerza', rpe: 'RPE 7-8',
  blocks: [validBlock],
  rationale: 'Sin cambios respecto baseline Excel S4',
};
const validWeek = {
  athlete: 'MK', week: 4,
  weekly_note: 'Base aeróbica progresando, mantener Z2 4 días (Excel S4)',
  days: [validDay, { ...validDay, key: 'D2' }, { ...validDay, key: 'D3' }],
};

describe('Generated schemas', () => {
  it('GeneratedBlock accepts a valid block', () => {
    expect(() => GeneratedBlock.parse(validBlock)).not.toThrow();
  });
  it('GeneratedDay requires at least one block', () => {
    expect(() => GeneratedDay.parse({ ...validDay, blocks: [] })).toThrow();
  });
  it('GeneratedWeek rejects week 0 and 24', () => {
    expect(() => GeneratedWeek.parse({ ...validWeek, week: 0 })).toThrow();
    expect(() => GeneratedWeek.parse({ ...validWeek, week: 24 })).toThrow();
  });
  it('GeneratedWeek requires 3 to 6 days', () => {
    expect(() => GeneratedWeek.parse({ ...validWeek, days: [validDay] })).toThrow();
    expect(() => GeneratedWeek.parse({
      ...validWeek,
      days: ['D1','D2','D3','D4','D5','D6','D6'].map((k) => ({ ...validDay, key: k as 'D1' })),
    })).toThrow();
  });
  it('GeneratedWeek accepts a fully valid payload', () => {
    expect(() => GeneratedWeek.parse(validWeek)).not.toThrow();
  });
});
