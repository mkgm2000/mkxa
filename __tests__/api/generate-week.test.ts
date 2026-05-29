import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.fn();
vi.mock('@/lib/anthropic/client', () => ({
  anthropic: () => ({ messages: { create } }),
  ANTHROPIC_MODEL: 'claude-sonnet-4-6',
}));

const insertResult = { data: { id: 'tw-1' }, error: null };
const insert = vi.fn(() => ({
  select: () => ({ single: () => Promise.resolve(insertResult) }),
}));
const maybeSingle = vi.fn();

const SOURCES = [
  { id: 'pdf_tema5_cualidades',                  file_id: 'file_a' },
  { id: 'pdf_tema6_concurrente',                 file_id: 'file_b' },
  { id: 'pdf_tema7_macro',                       file_id: 'file_c' },
  { id: 'pdf_macro_meso_micro',                  file_id: 'file_d' },
  { id: 'pdf_periodizacion_tradicional_inversa', file_id: 'file_e' },
  { id: 'xlsx_master_23s',                       file_id: 'file_f' },
];

// Chainable Supabase builder mock supporting eq/gte/lte/in chains,
// terminal awaits, and maybeSingle(). Each select() call gets its own
// chain so we can hand back different data per table.
function makeChain(data: unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.eq = vi.fn(self);
  chain.gte = vi.fn(self);
  chain.lte = vi.fn(self);
  chain.in = vi.fn(() => Promise.resolve({ data, error: null }));
  chain.maybeSingle = maybeSingle;
  (chain as { then?: unknown }).then = (
    resolve: (v: unknown) => unknown,
  ) => resolve({ data, error: null });
  return chain;
}

const select = vi.fn(() => makeChain(SOURCES));
const from = vi.fn(() => ({ select, insert }));

vi.mock('@/lib/supabase/server', () => ({
  supabaseServer: () => ({ from }),
}));

const VALID = {
  athlete: 'MK', week: 4,
  weekly_note: 'Base aeróbica. Excel S4.',
  days: [
    { key: 'D1', title: 'Fuerza', rpe: 'RPE 7-8',
      blocks: [{ name: 'Sentadilla', sets: '4x5', load: '32.5kg' }],
      rationale: 'Excel S4 baseline' },
    { key: 'D2', title: 'Z2',     rpe: 'RPE 4-5',
      blocks: [{ name: 'Carrera Z2', sets: "30'", load: '6:20/km' }],
      rationale: 'macro_meso_micro.pdf §carga progresiva' },
    { key: 'D3', title: 'HYROX',  rpe: 'RPE 5-6',
      blocks: [{ name: 'Ski Erg', sets: '3x250m', load: 'Técnica' }],
      rationale: 'Sin cambios respecto baseline Excel S4' },
  ],
};

describe('POST /api/training/generate-week', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  function makeReq(body: object) {
    return new Request('http://x/api/training/generate-week', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 200 with week_id and plan on a valid Claude response', async () => {
    create.mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify(VALID) }] });
    const { POST } = await import('@/app/api/training/generate-week/route');
    const res = await POST(makeReq({ athlete: 'MK', target_week: 4, extra_prompt: '' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan.days).toHaveLength(3);
  });

  it('returns 502 when Claude returns invalid JSON', async () => {
    create.mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json' }] });
    const { POST } = await import('@/app/api/training/generate-week/route');
    const res = await POST(makeReq({ athlete: 'MK', target_week: 4, extra_prompt: '' }));
    expect(res.status).toBe(502);
  });

  it('returns 400 when target_week is out of range', async () => {
    const { POST } = await import('@/app/api/training/generate-week/route');
    const res = await POST(makeReq({ athlete: 'MK', target_week: 24, extra_prompt: '' }));
    expect(res.status).toBe(400);
  });
});
