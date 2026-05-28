import { describe, it, expect, vi, beforeEach } from 'vitest';

interface Calls { table: string; method: string; args: unknown[] }
const calls: Calls[] = [];

function builder(table: string, data: unknown) {
  const b: Record<string, unknown> = {};
  b.select = vi.fn(() => b);
  b.eq     = vi.fn(() => b);
  b.single = vi.fn(() => Promise.resolve({ data, error: null }));
  b.update = vi.fn((p: unknown) => { calls.push({ table, method: 'update', args: [p] }); return b; });
  b.match  = vi.fn((m: unknown) => { calls.push({ table, method: 'match', args: [m] }); return Promise.resolve({ error: null }); });
  b.insert = vi.fn((p: unknown) => { calls.push({ table, method: 'insert', args: [p] }); return b; });
  (b as { then?: unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve({ data, error: null });
  return b;
}

vi.mock('@/lib/supabase/server', () => ({
  supabaseServer: () => ({
    from: (t: string) => {
      if (t === 'shopping_list') return builder(t, [{ name: 'pan' }, { name: 'leche' }]);
      if (t === 'expenses')      return builder(t, { id: 'exp-1' });
      return builder(t, []);
    },
  }),
}));

import { POST } from '@/app/api/meals/finish-shopping/route';

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/meals/finish-shopping', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/meals/finish-shopping', () => {
  beforeEach(() => { calls.length = 0; });

  it('rejects bad body', async () => {
    const r = await POST(makeReq({}));
    expect(r.status).toBe(400);
  });

  it('inserts expenses row with category=comida, archives list, returns expense_id', async () => {
    const r = await POST(makeReq({ week_start: '2026-05-25', total: 42.5, paid_by: 'MK' }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.expense_id).toBe('exp-1');

    const insert = calls.find((c) => c.table === 'expenses' && c.method === 'insert');
    expect(insert?.args[0]).toMatchObject({ category: 'comida', amount: 42.5, paid_by: 'MK' });
    const arch = calls.find((c) => c.table === 'shopping_list' && c.method === 'update');
    expect(arch?.args[0]).toEqual({ archived: true });
  });
});
