import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import type { ShoppingItem } from '@/lib/meals/recipes';

export const runtime = 'nodejs';

const Body = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total: z.number().positive(),
  paid_by: z.enum(['MK', 'Xabi', 'Compartido']),
  merchant: z.string().nullable().optional(),
  created_by: z.enum(['MK', 'Xabi']).optional(),
});

export async function POST(req: Request) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 });
  const { week_start, total, paid_by, merchant, created_by } = parsed.data;

  const supa = supabaseServer();

  // Build description summary from current active shopping_list.
  const { data: items, error: e1 } = await supa
    .from('shopping_list')
    .select('name')
    .eq('week_start', week_start)
    .eq('archived', false);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  const list = (items as Pick<ShoppingItem, 'name'>[]) ?? [];
  const names = list.map((i) => i.name);
  const head = names.slice(0, 3).join(', ');
  const description = `Compra semanal — ${names.length} items${head ? `: ${head}${names.length > 3 ? '…' : ''}` : ''}`;

  // Note: `expenses` table is owned by Plan 3 (feat/expenses-ocr branch).
  // At runtime this only works once both branches are merged together.
  const expensePayload = {
    amount: total,
    currency: 'EUR',
    category: 'comida',
    date: new Date().toISOString().slice(0, 10),
    paid_by,
    description,
    merchant: merchant ?? null,
    created_by: created_by ?? (paid_by === 'Compartido' ? 'MK' : paid_by),
  };

  const { data: expense, error: e2 } = await supa
    .from('expenses')
    .insert(expensePayload)
    .select('id')
    .single();
  if (e2) return NextResponse.json({ error: `expenses insert failed: ${e2.message}` }, { status: 500 });
  const expenseId = (expense as { id: string }).id;

  // Archive the list.
  const { error: e3 } = await supa
    .from('shopping_list')
    .update({ archived: true })
    .match({ week_start, archived: false });
  if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

  return NextResponse.json({ expense_id: expenseId });
}
