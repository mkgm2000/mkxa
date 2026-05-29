import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ReqSchema = z.object({ week_id: z.string().min(1) });

function jsonError(m: string, s: number) {
  return NextResponse.json({ error: m }, { status: s });
}

export async function PATCH(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON', 400); }
  const parsed = ReqSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid payload', 400);

  const supa = supabaseServer();

  const { data: row, error: selErr } = await supa
    .from('training_weeks')
    .select('athlete,week')
    .eq('id', parsed.data.week_id)
    .single();
  if (selErr || !row) return jsonError('Versión no encontrada', 404);
  const { athlete, week } = row as { athlete: 'MK' | 'Xabi'; week: number };

  const { error: supErr } = await supa
    .from('training_weeks')
    .update({ status: 'superseded' })
    .eq('athlete', athlete)
    .eq('week', week)
    .eq('status', 'confirmed');
  if (supErr) return jsonError('No se pudo archivar la versión previa', 500);

  const { error: cfErr } = await supa
    .from('training_weeks')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', parsed.data.week_id);
  if (cfErr) return jsonError('No se pudo confirmar la versión', 500);

  return NextResponse.json({ ok: true, athlete, week });
}
