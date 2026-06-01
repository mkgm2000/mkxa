import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Confirm either a single draft (legacy) OR both athletes' drafts atomically
// for a shared-generation week. Pass week_ids = [mkId, xabiId].
const ReqSchema = z.union([
  z.object({ week_id: z.string().min(1) }),
  z.object({ week_ids: z.array(z.string().min(1)).min(1).max(2) }),
]);

function jsonError(m: string, s: number) {
  return NextResponse.json({ error: m }, { status: s });
}

async function confirmOne(weekId: string) {
  const supa = supabaseServer();
  const { data: row, error: selErr } = await supa
    .from('training_weeks')
    .select('athlete,week')
    .eq('id', weekId)
    .single();
  if (selErr || !row) throw new Error(`Versión no encontrada: ${weekId}`);
  const { athlete, week } = row as { athlete: 'MK' | 'Xabi'; week: number };
  await supa.from('training_weeks')
    .update({ status: 'superseded' })
    .eq('athlete', athlete).eq('week', week).eq('status', 'confirmed');
  await supa.from('training_weeks')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', weekId);
  return { athlete, week };
}

export async function PATCH(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON', 400); }
  const parsed = ReqSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid payload', 400);

  try {
    const ids = 'week_ids' in parsed.data ? parsed.data.week_ids : [parsed.data.week_id];
    const results = [];
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await confirmOne(id));
    }
    return NextResponse.json({ ok: true, confirmed: results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 500);
  }
}
