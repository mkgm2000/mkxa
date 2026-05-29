import { describe, it, expect } from 'vitest';
import { buildDynamicContext } from '@/lib/training/dynamic-context';

describe('buildDynamicContext', () => {
  it('emits athlete + target_week + extra_prompt placeholder when empty', () => {
    const out = buildDynamicContext({
      athlete: 'MK', target_week: 4,
      extra_prompt: '',
      previousConfirmed: null,
      registros: [],
    });
    expect(out).toContain('ATLETA: MK');
    expect(out).toContain('SEMANA OBJETIVO: 4');
    expect(out).toContain('"(ninguna)"');
    expect(out).toContain('(no se generó previamente)');
    expect(out).toContain('(sin registros)');
  });

  it('inlines previousConfirmed and registros JSON', () => {
    const out = buildDynamicContext({
      athlete: 'Xabi', target_week: 5,
      extra_prompt: 'cuidar rodilla',
      previousConfirmed: { week: 4, days: [{ key: 'D1' }] } as never,
      registros: [{ week: 3, day_key: 'D1', completed: true, rpe: 7, notes: 'ok' } as never],
    });
    expect(out).toContain('"cuidar rodilla"');
    expect(out).toContain('"week":4');
    expect(out).toContain('"rpe":7');
  });
});
