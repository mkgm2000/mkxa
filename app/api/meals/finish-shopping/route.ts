import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import type { ShoppingItem, PantryItem, Aisle, MacrosSource } from '@/lib/meals/recipes';

export const runtime = 'nodejs';

const Body = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total: z.number().positive(),
  paid_by: z.enum(['MK', 'Xabi', 'Compartido']),
  merchant: z.string().nullable().optional(),
  created_by: z.enum(['MK', 'Xabi']).optional(),
});

// Force first character uppercase; rest stays as-is. Mirrors lib/hooks/use-pantry.ts.
function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase('es-ES') + s.slice(1);
}

type CheckedShoppingRow = Pick<
  ShoppingItem,
  | 'name'
  | 'aisle'
  | 'image_url'
  | 'off_barcode'
  | 'kcal_100g'
  | 'protein_100g'
  | 'carbs_100g'
  | 'fat_100g'
  | 'macros_source'
>;

type ExistingPantryRow = Pick<
  PantryItem,
  | 'id'
  | 'name'
  | 'image_url'
  | 'off_barcode'
  | 'kcal_100g'
  | 'protein_100g'
  | 'carbs_100g'
  | 'fat_100g'
  | 'macros_source'
>;

export async function POST(req: Request) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 });
  const { week_start, total, paid_by, merchant, created_by } = parsed.data;

  const supa = supabaseServer();

  // Fetch the full active shopping list — we need names for the expense
  // description AND the checked rows (with macros + media) for the pantry
  // sync below. Doing it in one query keeps the route to a single read.
  const { data: items, error: e1 } = await supa
    .from('shopping_list')
    .select('name, aisle, checked, image_url, off_barcode, kcal_100g, protein_100g, carbs_100g, fat_100g, macros_source')
    .eq('week_start', week_start)
    .eq('archived', false);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  const list = (items as (CheckedShoppingRow & { checked: boolean })[]) ?? [];
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

  // --- Pantry sync ---------------------------------------------------------
  // For every checked row, make sure it lives in `pantry_items` with
  // in_stock=true. New rows get the full media + macros payload; existing
  // rows are bumped to in_stock=true but we only fill blank fields so we
  // never blow away user-edited values.
  let pantryAdded = 0;
  const checked = list.filter((i) => i.checked === true);
  if (checked.length > 0) {
    // Dedup by capitalised name (pantry_items.name is unique). Keep first
    // occurrence — if two shopping rows share a name we don't care which
    // image wins, they're the same product.
    const byName = new Map<string, CheckedShoppingRow>();
    for (const row of checked) {
      const key = capitalise(row.name.trim());
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, row);
    }
    const wantedNames = Array.from(byName.keys());

    // Read existing pantry rows for those names so we can preserve
    // user-edited values (only fill nulls).
    const { data: existingRows, error: ePantryRead } = await supa
      .from('pantry_items')
      .select('id, name, image_url, off_barcode, kcal_100g, protein_100g, carbs_100g, fat_100g, macros_source')
      .in('name', wantedNames);
    if (ePantryRead) return NextResponse.json({ error: `pantry read failed: ${ePantryRead.message}` }, { status: 500 });
    const existingByName = new Map<string, ExistingPantryRow>();
    for (const r of (existingRows as ExistingPantryRow[]) ?? []) existingByName.set(r.name, r);

    const nowIso = new Date().toISOString();
    const upsertPayload = wantedNames.map((name) => {
      const src = byName.get(name)!;
      const existing = existingByName.get(name);
      // For each macro/media field: keep existing non-null, else take from source.
      const pickNullable = <K extends keyof CheckedShoppingRow & keyof ExistingPantryRow>(k: K) => {
        const cur = existing?.[k] ?? null;
        return cur !== null && cur !== undefined ? cur : src[k] ?? null;
      };
      return {
        name,
        aisle: src.aisle as Aisle,
        in_stock: true,
        image_url: pickNullable('image_url'),
        off_barcode: pickNullable('off_barcode'),
        kcal_100g: pickNullable('kcal_100g') as number | null,
        protein_100g: pickNullable('protein_100g') as number | null,
        carbs_100g: pickNullable('carbs_100g') as number | null,
        fat_100g: pickNullable('fat_100g') as number | null,
        macros_source: pickNullable('macros_source') as MacrosSource | null,
        updated_at: nowIso,
      };
    });

    if (upsertPayload.length > 0) {
      const { error: ePantryWrite } = await supa
        .from('pantry_items')
        .upsert(upsertPayload, { onConflict: 'name' });
      if (ePantryWrite) return NextResponse.json({ error: `pantry upsert failed: ${ePantryWrite.message}` }, { status: 500 });
      pantryAdded = upsertPayload.length;
    }
  }

  return NextResponse.json({ expense_id: expenseId, pantry_added: pantryAdded });
}
