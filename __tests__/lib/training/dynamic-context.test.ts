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
    expect(out).toContain('(sin registros previos — devuelve baseline literal del Excel)');
  });

  it('inlines previousConfirmed as JSON and formats registros hierarchically', () => {
    const out = buildDynamicContext({
      athlete: 'Xabi', target_week: 5,
      extra_prompt: 'cuidar rodilla',
      previousConfirmed: { week: 4, days: [{ key: 'D1' }] } as never,
      registros: [{ week: 3, day_key: 'D1', completed: true, rpe: 7, notes: 'ok', week_note: null } as never],
    });
    expect(out).toContain('"cuidar rodilla"');
    expect(out).toContain('"week":4');
    expect(out).toContain('### S3 (1/4 sesiones completadas)');
    expect(out).toContain('D1 [✓ RPE 7]');
    expect(out).toContain('"ok"');
  });

  it('groups registros by week, marks completion, collapses note newlines, and shows week_note once', () => {
    const out = buildDynamicContext({
      athlete: 'MK', target_week: 4,
      extra_prompt: '',
      previousConfirmed: null,
      registros: [
        { week: 1, day_key: 'D1', completed: true, rpe: 5,
          notes: 'Press de banca con 20kg\nDominadas no pude no tengo banda\nHice superseries...',
          week_note: 'Mala semana para comenzar, solo entrene un día, me dio fiebre...' } as never,
        { week: 1, day_key: 'D2', completed: false, rpe: null, notes: null,
          week_note: 'Mala semana para comenzar, solo entrene un día, me dio fiebre...' } as never,
        { week: 1, day_key: 'D3', completed: false, rpe: null, notes: null,
          week_note: 'Mala semana para comenzar, solo entrene un día, me dio fiebre...' } as never,
        { week: 1, day_key: 'D4', completed: false, rpe: null, notes: null,
          week_note: 'Mala semana para comenzar, solo entrene un día, me dio fiebre...' } as never,
        { week: 2, day_key: 'D1', completed: true, rpe: 6, notes: 'todo bien', week_note: null } as never,
      ],
    });
    expect(out).toContain('REGISTROS REALES HISTÓRICO COMPLETO (S1 → S3, 5 entradas)');
    expect(out).toContain('### S1 (1/4 sesiones completadas; nota semanal: "Mala semana para comenzar, solo entrene un día, me dio fiebre...")');
    expect(out).toContain('D1 [✓ RPE 5]  "Press de banca con 20kg / Dominadas no pude no tengo banda / Hice superseries..."');
    expect(out).toContain('D2 [✗ no completada]');
    expect(out).toContain('D3 [✗ no completada]');
    expect(out).toContain('D4 [✗ no completada]');
    expect(out).toContain('### S2 (1/4 sesiones completadas)');
    // week_note from S1 should appear only once (in S1 header), not in S2 header
    const s2HeaderIdx = out.indexOf('### S2');
    expect(out.slice(s2HeaderIdx)).not.toContain('Mala semana');
  });
});
