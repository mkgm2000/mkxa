import { NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic/client';
import { RECIPE_SYSTEM_PROMPT } from '@/lib/anthropic/recipe-prompts';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  image_base64: z.string().optional(),
  media_type: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
  caption_text: z.string().optional(),
  source_url: z.string().optional(),
});

const AISLE_ENUM = z.enum([
  'frutas_verduras', 'pescaderia', 'carniceria', 'lacteos',
  'panaderia', 'despensa', 'congelados', 'bebidas', 'otros',
]);
const UNIT_ENUM = z.enum(['g', 'ml', 'unidad', 'cda', 'cdita', 'pizca', 'al gusto']).nullable();

const RecipeJsonSchema = z.object({
  title: z.string(),
  prep_minutes: z.number().nullable(),
  servings: z.number().nullable(),
  tags: z.array(z.string()).max(8),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.number().nullable(),
    unit: UNIT_ENUM,
    aisle: AISLE_ENUM,
    optional: z.boolean(),
  })),
  steps: z.array(z.object({
    body: z.string(),
    timer_min: z.number().nullable(),
  })),
  confidence: z.number(),
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON body'); }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid request shape');
  const { image_base64, media_type, caption_text, source_url } = parsed.data;
  if (!image_base64 && !caption_text) return jsonError('Provide at least image_base64 or caption_text');

  // Build a multi-modal user turn — image (if present) then text context.
  type Block =
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'text'; text: string };
  const content: Block[] = [];
  if (image_base64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: media_type ?? 'image/jpeg', data: image_base64 },
    });
  }
  const textParts: string[] = [];
  if (source_url)   textParts.push(`URL fuente: ${source_url}`);
  if (caption_text) textParts.push(`Descripción / caption:\n${caption_text}`);
  if (textParts.length === 0) textParts.push('Extrae la receta de la imagen.');
  content.push({ type: 'text', text: textParts.join('\n\n') });

  let raw: string;
  try {
    const res = await anthropic().messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      // cache_control belongs to the prompt-caching beta; SDK v0.27 has
      // not widened TextBlockParam yet, so cast through unknown.
      system: [{
        type: 'text',
        text: RECIPE_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      } as unknown as Anthropic.TextBlockParam],
      // Cast to unknown to keep this compatible across SDK minor versions.
      messages: [{ role: 'user', content: content as unknown as never }],
    });
    const first = res.content.find((b) => b.type === 'text');
    raw = first && 'text' in first ? first.text : '';
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Anthropic error';
    return jsonError(`Anthropic: ${msg}`, 502);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw.trim().replace(/^```json\s*|\s*```$/g, ''));
  } catch {
    return jsonError('Modelo devolvió JSON inválido', 502);
  }

  const checked = RecipeJsonSchema.safeParse(parsedJson);
  if (!checked.success) {
    return NextResponse.json({ error: 'Schema mismatch', issues: checked.error.issues, raw: parsedJson }, { status: 502 });
  }

  return NextResponse.json(checked.data);
}
