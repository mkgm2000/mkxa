import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ANTHROPIC_MODEL } from '@/lib/anthropic/client';
import { TRAINING_SYSTEM_PROMPT } from '@/lib/anthropic/training-prompts';
import { readTrainingSources } from '@/lib/training/sources';
import { buildDynamicContext, type RecentRegistro } from '@/lib/training/dynamic-context';
import { GeneratedWeekPair, GeneratedWeek } from '@/lib/training/generated';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const ReqSchema = z.object({
  // Backwards compat: athlete is optional. If provided, we still generate
  // the COMMON pair plan but route the success response toward that athlete
  // (the legacy single-athlete flow). New callers pass `target_week` only.
  athlete: z.enum(['MK', 'Xabi']).optional(),
  target_week: z.number().int().min(1).max(23),
  extra_prompt: z.string().max(500).optional(),
});

const DELOAD_WEEKS = new Set([8, 12, 17]);
const REQUIRED_SOURCE_COUNT = 8;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON body', 400); }
  const parsed = ReqSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid payload', 400);
  const { target_week } = parsed.data;
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

  // Attached on every call: Master Plan v8 (~22k tok) + Bateria Ejercicios (~3k).
  // PDFs UFV referenciados por nombre (sin attach) y Rulebook referenciado en el
  // system prompt (Claude tiene conocimiento + el system list las 8 estaciones
  // y cargas). Esto deja ~25-27k tokens totales, dentro del rate-limit 30k/min.
  const xlsxSource = sources.find((s) => s.id === 'xlsx_master_23s');
  const batSource = sources.find((s) => s.id === 'xlsx_bateria_ejercicios');
  if (!xlsxSource) return jsonError('Falta xlsx_master_23s en training_sources', 500);
  if (!batSource) return jsonError('Falta xlsx_bateria_ejercicios en training_sources', 500);
  const docSources = [xlsxSource, batSource];

  const supa = supabaseServer();

  // SHARED generation: fetch BOTH athletes' registros (S1 → target-1).
  // The prompt processes both — the output covers both plans.
  const { data: mkRows } = await supa.from('registros')
    .select('week,day_key,completed,rpe,notes,week_note,custom_blocks,extra_blocks,deleted_blocks')
    .eq('athlete', 'MK')
    .gte('week', 1)
    .lte('week', target_week - 1)
    .order('week', { ascending: true })
    .order('day_key', { ascending: true });
  const { data: xabiRows } = await supa.from('registros')
    .select('week,day_key,completed,rpe,notes,week_note,custom_blocks,extra_blocks,deleted_blocks')
    .eq('athlete', 'Xabi')
    .gte('week', 1)
    .lte('week', target_week - 1)
    .order('week', { ascending: true })
    .order('day_key', { ascending: true });
  const mkRegistros = (mkRows ?? []) as RecentRegistro[];
  const xabiRegistros = (xabiRows ?? []) as RecentRegistro[];

  const { data: mkPrev } = await supa.from('training_weeks')
    .select('plan_jsonb')
    .eq('athlete', 'MK').eq('week', target_week - 1).eq('status', 'confirmed')
    .maybeSingle();
  const { data: xabiPrev } = await supa.from('training_weeks')
    .select('plan_jsonb')
    .eq('athlete', 'Xabi').eq('week', target_week - 1).eq('status', 'confirmed')
    .maybeSingle();
  const previousMk = mkPrev && (mkPrev as { plan_jsonb: unknown }).plan_jsonb
    ? ((mkPrev as { plan_jsonb: import('@/lib/training/generated').GeneratedWeek }).plan_jsonb)
    : null;
  const previousXabi = xabiPrev && (xabiPrev as { plan_jsonb: unknown }).plan_jsonb
    ? ((xabiPrev as { plan_jsonb: import('@/lib/training/generated').GeneratedWeek }).plan_jsonb)
    : null;

  // Build combined dynamic context — registros for both athletes, side by side.
  const dynamicText = [
    `SEMANA OBJETIVO: ${target_week}`,
    `NOTAS EXTRA: "${extra_prompt.trim() || '(ninguna)'}"`,
    '',
    `===== MK =====`,
    buildDynamicContext({
      athlete: 'MK',
      target_week,
      extra_prompt: '',
      previousConfirmed: previousMk,
      registros: mkRegistros,
    }),
    '',
    `===== Xabi =====`,
    buildDynamicContext({
      athlete: 'Xabi',
      target_week,
      extra_prompt: '',
      previousConfirmed: previousXabi,
      registros: xabiRegistros,
    }),
    '',
    `Genera la SEMANA ${target_week} COMÚN para AMBOS atletas. Output JSON con campos { week, weekly_note, mk: GeneratedWeek, xabi: GeneratedWeek }. Las sesiones (day_key) son COMUNES; las cargas y volúmenes pueden diferir según RM y registros de cada atleta.`,
  ].join('\n');

  type DocBlock = { type: 'document'; source: { type: 'file'; file_id: string }; cache_control?: { type: 'ephemeral' } };
  type TextBlock = { type: 'text'; text: string };
  const docBlocks: DocBlock[] = docSources.map((s, i, arr) => ({
    type: 'document',
    source: { type: 'file', file_id: s.file_id },
    ...(i === arr.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
  const content: Array<DocBlock | TextBlock> = [...docBlocks, { type: 'text', text: dynamicText }];

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
        max_tokens: 8192,
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
      if (httpRes.status === 429) {
        const retryAfter = httpRes.headers.get('retry-after') ?? '60';
        return NextResponse.json(
          {
            error: 'Rate limit alcanzado',
            detail: 'Anthropic limita 30k tokens/min. Espera y reintenta.',
            retry_after_seconds: Number(retryAfter) || 60,
          },
          { status: 429, headers: { 'retry-after': retryAfter } },
        );
      }
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
  const safe = GeneratedWeekPair.safeParse(parsedJson);
  if (!safe.success) {
    console.error('[generate-week] schema mismatch', JSON.stringify(safe.error.issues));
    return NextResponse.json(
      {
        error: 'Modelo devolvió formato inesperado',
        issues: safe.error.issues.slice(0, 8),
        sample: JSON.stringify(parsedJson).slice(0, 600),
      },
      { status: 502 },
    );
  }
  const pair = safe.data;

  // Insert TWO drafts (one per athlete) for this week_pair.
  const sourceSummary = {
    mk_registros: mkRegistros,
    xabi_registros: xabiRegistros,
    previousMk: previousMk ? { week: previousMk.week } : null,
    previousXabi: previousXabi ? { week: previousXabi.week } : null,
  };

  async function insertDraft(athlete: 'MK' | 'Xabi', plan: GeneratedWeek): Promise<string | null> {
    const { data: versions } = await supa.from('training_weeks')
      .select('version').eq('athlete', athlete).eq('week', target_week);
    const nextVersion = ((versions as { version: number }[] | null) ?? [])
      .reduce((m, r) => Math.max(m, r.version), 0) + 1;
    const { data: inserted, error: insErr } = await supa.from('training_weeks')
      .insert({
        athlete, week: target_week, version: nextVersion, status: 'draft',
        plan_jsonb: plan, weekly_note: plan.weekly_note,
        generated_by: 'claude', extra_prompt: extra_prompt || null,
        source_summary: sourceSummary,
      })
      .select('id')
      .single();
    if (insErr || !inserted) return null;
    return (inserted as { id: string }).id;
  }

  const mkId = await insertDraft('MK', pair.mk);
  const xabiId = await insertDraft('Xabi', pair.xabi);
  if (!mkId || !xabiId) return jsonError('No se pudo guardar el borrador', 500);

  return NextResponse.json({
    week: pair.week,
    weekly_note: pair.weekly_note,
    mk: { week_id: mkId, plan: pair.mk },
    xabi: { week_id: xabiId, plan: pair.xabi },
  });
}
