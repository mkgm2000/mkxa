import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ANTHROPIC_MODEL } from '@/lib/anthropic/client';
import { TRAINING_SYSTEM_PROMPT } from '@/lib/anthropic/training-prompts';
import { readTrainingSources } from '@/lib/training/sources';
import { buildDynamicContext, type RecentRegistro } from '@/lib/training/dynamic-context';
import { GeneratedWeek } from '@/lib/training/generated';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const ReqSchema = z.object({
  athlete: z.enum(['MK', 'Xabi']),
  target_week: z.number().int().min(1).max(23),
  extra_prompt: z.string().max(500).optional(),
});

// Deload weeks per the Excel master plan — intocables.
const DELOAD_WEEKS = new Set([8, 12, 17]);
const REQUIRED_SOURCE_COUNT = 7;

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

  // Rate limit (org tier 30k tok/min) restringe qué adjuntamos: el Excel
  // master plan (text/plain, ~14k tok) Y el rulebook HYROX Doubles (~8-10k
  // tok). Los 5 PDFs académicos UFV se referencian por nombre en el system
  // prompt; Claude tiene conocimiento sólido de S.G.A., supercompensación,
  // interferencia AMPK/mTOR, periodización concurrent/tradicional/inversa.
  const xlsxSource = sources.find((s) => s.id === 'xlsx_master_23s');
  const rulebookSource = sources.find((s) => s.id === 'pdf_rulebook_hyrox_doubles');
  if (!xlsxSource) return jsonError('Falta xlsx_master_23s en training_sources', 500);
  if (!rulebookSource) return jsonError('Falta pdf_rulebook_hyrox_doubles en training_sources', 500);
  const docSources = [xlsxSource, rulebookSource];

  const supa = supabaseServer();
  // Trae el histórico COMPLETO previo (semanas 1 a target_week - 1) para que
  // Claude vea la evolución entera del atleta, no solo las últimas 2 semanas.
  const { data: regRows } = await supa.from('registros')
    .select('week,day_key,completed,rpe,notes,week_note')
    .eq('athlete', athlete)
    .gte('week', 1)
    .lte('week', target_week - 1)
    .order('week', { ascending: true })
    .order('day_key', { ascending: true });
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
  const docBlocks: DocBlock[] = docSources.map((s, i, arr) => ({
    type: 'document',
    source: { type: 'file', file_id: s.file_id },
    ...(i === arr.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
  const content: Array<DocBlock | TextBlock> = [...docBlocks, { type: 'text', text: dynamicText }];

  // SDK v0.27 doesn't support file_id document sources — call REST directly
  // with the files-api beta header.
  const rawKey = process.env.ANTHROPIC_API_KEY ?? '';
  const apiKey = rawKey.trim().match(/^[A-Za-z0-9_-]+/)?.[0] ?? '';
  if (!apiKey) return jsonError('ANTHROPIC_API_KEY misconfigured', 500);

  let rawText: string;
  try {
    const httpRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        system: [{
          type: 'text',
          text: TRAINING_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        }],
        messages: [{ role: 'user', content }],
      }),
    });
    if (!httpRes.ok) {
      const txt = await httpRes.text();
      throw Object.assign(new Error(`${httpRes.status} ${txt}`), { status: httpRes.status });
    }
    const json = (await httpRes.json()) as { content: Array<{ type: string; text?: string }> };
    const first = json.content.find((b) => b.type === 'text');
    rawText = first && first.text ? first.text : '';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number })?.status;
    console.error('[generate-week] anthropic error status=', status, 'msg=', msg.slice(0, 400));
    return NextResponse.json(
      { error: 'Algo falló pidiendo a Claude. Reintenta.', detail: msg.slice(0, 300), status: status ?? null },
      { status: 502 },
    );
  }

  let parsedJson: unknown;
  try { parsedJson = JSON.parse(rawText.trim().replace(/^```json\s*|\s*```$/g, '')); }
  catch {
    console.error('[generate-week] JSON.parse failed; raw=', rawText.slice(0, 600));
    return NextResponse.json(
      { error: 'Modelo devolvió formato inesperado (no es JSON)', detail: rawText.slice(0, 600) },
      { status: 502 },
    );
  }
  const safe = GeneratedWeek.safeParse(parsedJson);
  if (!safe.success) {
    console.error('[generate-week] schema mismatch', JSON.stringify(safe.error.issues));
    return NextResponse.json(
      {
        error: 'Modelo devolvió formato inesperado',
        issues: safe.error.issues.slice(0, 8),
        sample: JSON.stringify(parsedJson).slice(0, 400),
      },
      { status: 502 },
    );
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
