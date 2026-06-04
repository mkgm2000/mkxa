import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ANTHROPIC_MODEL } from '@/lib/anthropic/client';

// Runs in Node (Anthropic SDK uses Node APIs, not edge-safe).
export const runtime = 'nodejs';

// Base64 grows ~33% vs raw bytes; cap matches the client-side 5–6MB resize budget.
const MAX_IMAGE_B64 = 8_000_000;

const RequestSchema = z.object({
  image_base64: z.string().min(10).max(MAX_IMAGE_B64),
  media_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

const TicketSchema = z.object({
  merchant: z.string().nullable(),
  total: z.number().nullable(),
  date: z.string().nullable(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().nullable().default(null),
        unit_price: z.number().nullable().default(null),
        line_total: z.number().nullable().default(null),
      }),
    )
    .default([]),
});

const TICKET_PROMPT = `Eres un parser de tickets de supermercado español. Extrae los datos del ticket como JSON estricto. NO añadas texto fuera del JSON.
Esquema:
{"merchant": string, "total": number (euros), "date": "YYYY-MM-DD" o null,
 "items": [{"name": string, "quantity": number|null, "unit_price": number|null, "line_total": number|null}]}
Notas:
- Captura SOLO líneas de producto. Ignora "TOTAL", "EFECTIVO", "IVA", "DEVOLUCIÓN", "TARJETA", "GRACIAS POR SU COMPRA", etc.
- Si la cantidad no aparece explícita, déjala null.
- Nombres tal cual aparecen en el ticket, en mayúsculas si así están.
- Números en formato es-ES con coma decimal ("1,23") devuélvelos con punto decimal ("1.23").
- Fechas en formato DD/MM/YYYY conviértelas a YYYY-MM-DD. Si no hay fecha, null.
- Devuelve SOLO el JSON, sin markdown ni texto adicional.`;

function stripJsonFence(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fence ? fence[1] : text).trim();
}

// Local Anthropic client so this route stays independent of the legacy
// /api/ocr-receipt module (which uses prompt-caching + a different schema).
// We re-trim the env var defensively per the project memory.
function makeClient(): Anthropic {
  const raw = process.env.ANTHROPIC_API_KEY;
  if (!raw) throw new Error('Missing ANTHROPIC_API_KEY');
  const apiKey = raw.trim().match(/^[A-Za-z0-9_-]+/)?.[0] ?? '';
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY malformed');
  return new Anthropic({ apiKey });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const parsedReq = RequestSchema.safeParse(body);
  if (!parsedReq.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const client = makeClient();
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      temperature: 0,
      system: TICKET_PROMPT,
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
            { type: 'text', text: 'Extrae el JSON del ticket.' },
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
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON from model' }, { status: 500 });
    }
    const safe = TicketSchema.safeParse(parsed);
    if (!safe.success) {
      return NextResponse.json({ error: 'Schema mismatch' }, { status: 500 });
    }
    return NextResponse.json(safe.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number })?.status;
    console.error('[ocr/ticket] status=', status, 'msg=', msg);
    return NextResponse.json({ error: 'OCR failed' }, { status: 500 });
  }
}
