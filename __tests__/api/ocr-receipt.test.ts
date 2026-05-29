import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.fn();

vi.mock('@/lib/anthropic/client', () => ({
  anthropic: () => ({ messages: { create } }),
  ANTHROPIC_MODEL: 'claude-sonnet-4-6',
}));

import { POST } from '@/app/api/ocr-receipt/route';

function mkReq(body: unknown) {
  return new Request('http://localhost/api/ocr-receipt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

describe('POST /api/ocr-receipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test';
  });

  it('400 on bad payload', async () => {
    const res = await POST(mkReq({ wrong: true }));
    expect(res.status).toBe(400);
  });

  it('calls Anthropic with cache_control on the system block and parses JSON', async () => {
    create.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          total: 12.5,
          date: '2026-05-20',
          merchant: 'Mercadona',
          category_suggested: 'comida',
          items: [{ name: 'Pan', price: 1.2 }],
          confidence: 0.92,
        }),
      }],
    });

    const res = await POST(mkReq({
      image_base64: 'AAAAAAAAAA',
      media_type: 'image/jpeg',
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(12.5);
    expect(data.merchant).toBe('Mercadona');
    expect(data.category_suggested).toBe('comida');

    const callArg = create.mock.calls[0][0];
    expect(callArg.model).toBe('claude-sonnet-4-6');
    expect(Array.isArray(callArg.system)).toBe(true);
    expect(callArg.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(callArg.system[0].type).toBe('text');
    expect(callArg.messages[0].content[0].type).toBe('image');
    expect(callArg.messages[0].content[0].source.media_type).toBe('image/jpeg');
  });

  it('handles fenced JSON in the response', async () => {
    create.mockResolvedValue({
      content: [{
        type: 'text',
        text: '```json\n{"total":5,"date":null,"merchant":"X","category_suggested":"otros","items":[],"confidence":0.4}\n```',
      }],
    });
    const res = await POST(mkReq({
      image_base64: 'AAAAAAAAAA',
      media_type: 'image/png',
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(5);
    expect(data.confidence).toBe(0.4);
  });

  it('500 sanitized on Anthropic error', async () => {
    create.mockRejectedValue(new Error('boom'));
    const res = await POST(mkReq({
      image_base64: 'AAAAAAAAAA',
      media_type: 'image/png',
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('OCR failed');
  });

  it('500 on schema mismatch', async () => {
    create.mockResolvedValue({
      content: [{ type: 'text', text: '{"foo":"bar"}' }],
    });
    const res = await POST(mkReq({
      image_base64: 'AAAAAAAAAA',
      media_type: 'image/jpeg',
    }));
    expect(res.status).toBe(500);
  });
});
