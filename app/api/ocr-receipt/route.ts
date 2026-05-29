import { NextResponse, type NextRequest } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic/client';
import { RECEIPT_SYSTEM_PROMPT } from '@/lib/anthropic/prompts';
import { CATEGORIES } from '@/lib/expenses';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  image_base64: z.string().min(10),
  media_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

const ReceiptSchema = z.object({
  total: z.number().nullable(),
  date: z.string().nullable(),
  merchant: z.string().nullable(),
  category_suggested: z.enum(CATEGORIES).nullable(),
  items: z.array(z.object({
    name: z.string(),
    price: z.number().nullable(),
  })).default([]),
  confidence: z.number().min(0).max(1).nullable(),
});

function stripJsonFence(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fence ? fence[1] : text).trim();
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }
  const parsedReq = RequestSchema.safeParse(body);
  if (!parsedReq.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const client = anthropic();
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      // cache_control on system block requires the prompt-caching beta;
      // SDK v0.27 has not widened TextBlockParam yet, so cast here.
      system: [
        {
          type: 'text',
          text: RECEIPT_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        } as unknown as Anthropic.TextBlockParam,
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: parsedReq.data.media_type,
                data: parsedReq.data.image_base64,
              },
            },
            { type: 'text', text: 'Extrae los datos del ticket.' },
          ],
        },
      ],
    });

    const first = response.content[0];
    if (!first || first.type !== 'text') {
      return NextResponse.json({ error: 'No text response' }, { status: 500 });
    }
    const raw = stripJsonFence(first.text);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch {
      return NextResponse.json({ error: 'Malformed JSON' }, { status: 500 });
    }
    const safe = ReceiptSchema.safeParse(parsed);
    if (!safe.success) {
      return NextResponse.json({ error: 'Schema mismatch' }, { status: 500 });
    }
    return NextResponse.json(safe.data);
  } catch (err) {
    console.error('[ocr-receipt]', err);
    return NextResponse.json({ error: 'OCR failed' }, { status: 500 });
  }
}
