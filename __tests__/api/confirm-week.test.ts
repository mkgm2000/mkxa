import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable builder: every method returns this; thenable resolves with the
// configured result; .single() returns the configured "single" result.
function makeBuilder(opts: { single?: { data: unknown; error: unknown }, thenResult?: { data: unknown; error: unknown } }) {
  const self: Record<string, unknown> = {};
  const methods = ['select','update','insert','eq','gte','lte','in','order','limit'];
  for (const m of methods) self[m] = vi.fn(() => self);
  self.single = vi.fn(() => Promise.resolve(opts.single ?? { data: null, error: null }));
  self.maybeSingle = vi.fn(() => Promise.resolve(opts.single ?? { data: null, error: null }));
  // thenable for `await supa.from(...).update(...).eq(...)`
  self.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve(opts.thenResult ?? { data: null, error: null });
  return self;
}

const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  supabaseServer: () => ({ from: fromMock }),
}));

describe('PATCH /api/training/confirm-week', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects missing week_id with 400', async () => {
    fromMock.mockReturnValue(makeBuilder({}));
    const { PATCH } = await import('@/app/api/training/confirm-week/route');
    const res = await PATCH(new Request('http://x/api/training/confirm-week', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when target row is missing', async () => {
    fromMock.mockReturnValue(makeBuilder({ single: { data: null, error: { message: 'no row' } } }));
    const { PATCH } = await import('@/app/api/training/confirm-week/route');
    const res = await PATCH(new Request('http://x/api/training/confirm-week', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ week_id: 'missing' }),
    }));
    expect(res.status).toBe(404);
  });

  it('confirms a valid row and returns 200', async () => {
    // First call: SELECT (returns row). Second & third: UPDATEs (thenable resolves ok).
    let call = 0;
    fromMock.mockImplementation(() => {
      call++;
      if (call === 1) {
        return makeBuilder({ single: { data: { athlete: 'MK', week: 4 }, error: null } });
      }
      return makeBuilder({ thenResult: { data: null, error: null } });
    });
    const { PATCH } = await import('@/app/api/training/confirm-week/route');
    const res = await PATCH(new Request('http://x/api/training/confirm-week', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ week_id: 'tw-1' }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.athlete).toBe('MK');
    expect(body.week).toBe(4);
  });
});
