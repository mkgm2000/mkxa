import { describe, it, expect, vi, beforeEach } from 'vitest';

interface Calls { table: string; method: string; args: unknown[] }
const calls: Calls[] = [];

function makeBuilder(table: string, data: unknown) {
  let _data = data;
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq     = vi.fn(() => builder);
  builder.in     = vi.fn(() => builder);
  builder.update = vi.fn((patch: unknown) => { calls.push({ table, method: 'update', args: [patch] }); return builder; });
  builder.match  = vi.fn((m: unknown) => { calls.push({ table, method: 'match', args: [m] }); return Promise.resolve({ error: null }); });
  builder.insert = vi.fn((rows: unknown) => { calls.push({ table, method: 'insert', args: [rows] }); _data = rows; return builder; });
  // Make builder thenable so awaiting it after select() returns data.
  (builder as { then?: unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: _data, error: null });
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  supabaseServer: () => ({
    from: (table: string) => {
      if (table === 'meal_plan')         return makeBuilder(table, [
        { id: 'p1', week_start: '2026-05-25', day: 'mon', slot: 'lunch', recipe_id: 'r1', servings: 2, done: false },
      ]);
      if (table === 'recipes')           return makeBuilder(table, [
        { id: 'r1', title: 'T', servings: 2 },
      ]);
      if (table === 'recipe_ingredients') return makeBuilder(table, [
        { recipe_id: 'r1', name: 'sal', quantity: 1, unit: 'pizca', aisle: 'despensa', position: 0 },
      ]);
      if (table === 'pantry_items')      return makeBuilder(table, []);
      if (table === 'shopping_list')     return makeBuilder(table, [{ id: 'new', name: 'sal' }]);
      return makeBuilder(table, []);
    },
  }),
}));

import { POST } from '@/app/api/meals/generate-shopping/route';

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/meals/generate-shopping', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/meals/generate-shopping', () => {
  beforeEach(() => { calls.length = 0; });

  it('rejects bad body shape', async () => {
    const r = await POST(makeReq({}));
    expect(r.status).toBe(400);
  });

  it('archives prior list, inserts new rows, returns them', async () => {
    const r = await POST(makeReq({ week_start: '2026-05-25' }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body.rows)).toBe(true);

    const archive = calls.find((c) => c.table === 'shopping_list' && c.method === 'update');
    expect(archive?.args[0]).toEqual({ archived: true });
    const insert = calls.find((c) => c.table === 'shopping_list' && c.method === 'insert');
    expect(insert).toBeTruthy();
  });
});
