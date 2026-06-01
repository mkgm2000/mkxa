import { NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic/client';
import { TRAINING_SYSTEM_PROMPT } from '@/lib/anthropic/training-prompts';
import { readTrainingSources } from '@/lib/training/sources';
import { buildDynamicContext, type RecentRegistro } from '@/lib/training/dynamic-context';
import { GeneratedWeek } from '@/lib/training/generated';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ReqSchema = z.object({
  athlete: z.enum(['MK', 'Xabi']),
  target_week: z.number().int().min(1).max(23),
  extra_prompt: z.string().max(500).optional(),
});

// Deload weeks per the Excel master plan — intocables.
const DELOAD_WEEKS = new Set([8, 12, 17]);
const REQUIRED_SOURCE_COUNT = 6;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON body', 400); }
  const parsed = ReqSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid payload', 400);
  const { athlete, target_week } = parsed.data;
  const extra_prompt = parsed.data.extra_prompt ?? '';

  if (DELOAD_WEEKS.has(target_week)) {
    return jsonError(
      `S${target_week} es semana de descarga (intocable según el Excel master). No se regenera.`,
      400,
    );
  }

  let sources: Awaited<ReturnType<typeof readTrainingSources>>;
  try { sources = await readTrainingSources(); } catch { return jsonError('Las fuentes no están subidas; ejecuta scripts/upload-training-sources.ts', 500); }
  if (sources.length !== REQUIRED_SOURCE_COUNT) {
    console.error('[generate-week] expected', REQUIRED_SOURCE_COUNT, 'sources, got', sources.length, sources.map((s) => s.id));
    return jsonError(`Faltan fuentes (${sources.length}/${REQUIRED_SOURCE_COUNT}); ejecuta scripts/upload-training-sources.ts`, 500);
  }

  const supa = supabaseServer();
  const lo = Math.max(1, target_week - 2);
  const { data: regRows } = await supa.from('registros')
    .select('week,day_key,completed,rpe,notes,week_note')
    .eq('athlete', athlete)
    .gte('week', lo)
    .lte('week', target_week - 1);
  const registros = (regRows ?? []) as RecentRegistro[];

  const { data: prevRow } = await supa.from('training_weeks')
    .select('plan_jsonb')
    .eq('athlete', athlete).eq('week', target_week - 1).eq('status', 'confirmed')
    .maybeSingle();
  const previousConfirmed = prevRow && (prevRow as { plan_jsonb: unknown }).plan_jsonb
    ? ((prevRow as { plan_jsonb: import('@/lib/training/generated').GeneratedWeek }).plan_jsonb)
    : null;

  const dynamicText = buildDynamicContext({
    athlete, target_week, extra_prompt, previousConfirmed, registros,
  });

  type DocBlock = { type: 'document'; source: { type: 'file'; file_id: string }; cache_control?: { type: 'ephemeral' } };
  type TextBlock = { type: 'text'; text: string };
  const docBlocks: DocBlock[] = sources.map((s, i, arr) => ({
    type: 'document',
    source: { type: 'file', file_id: s.file_id },
    ...(i === arr.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
  const content: Array<DocBlock | TextBlock> = [...docBlocks, { type: 'text', text: dynamicText }];

  let rawText: string;
  try {
    const res = await anthropic().messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: [{
        type: 'text',
        text: TRAINING_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      } as unknown as Anthropic.TextBlockParam],
      messages: [{ role: 'user', content: content as unknown as never }],
    } as unknown as Anthropic.MessageCreateParamsNonStreaming);
    const first = res.content.find((b) => b.type === 'text');
    rawText = first && 'text' in first ? first.text : '';
  } catch (err) {
    console.error('[generate-week] anthropic error', err);
    return jsonError('Algo falló pidiendo a Claude. Reintenta.', 502);
  }

  let parsedJson: unknown;
  try { parsedJson = JSON.parse(rawText.trim().replace(/^```json\s*|\s*```$/g, '')); }
  catch { return jsonError('Modelo devolvió formato inesperado', 502); }
  const safe = GeneratedWeek.safeParse(parsedJson);
  if (!safe.success) {
    console.error('[generate-week] schema mismatch', safe.error.issues, parsedJson);
    return jsonError('Modelo devolvió formato inesperado', 502);
  }
  const plan = safe.data;

  const { data: versions } = await supa.from('training_weeks')
    .select('version').eq('athlete', athlete).eq('week', target_week);
  const nextVersion = ((versions as { version: number }[] | null) ?? [])
    .reduce((m, r) => Math.max(m, r.version), 0) + 1;

  const { data: inserted, error: insErr } = await supa.from('training_weeks')
    .insert({
      athlete, week: target_week, version: nextVersion, status: 'draft',
      plan_jsonb: plan, weekly_note: plan.weekly_note,
      generated_by: 'claude', extra_prompt: extra_prompt || null,
      source_summary: { registros, previousConfirmed: previousConfirmed ? { week: previousConfirmed.week } : null },
    })
    .select('id')
    .single();
  if (insErr || !inserted) return jsonError('No se pudo guardar el borrador', 500);

  return NextResponse.json({ week_id: (inserted as { id: string }).id, plan });
}
