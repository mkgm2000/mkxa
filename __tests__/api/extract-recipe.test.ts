import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.fn();
vi.mock('@/lib/anthropic/client', () => ({
  anthropic: () => ({ messages: { create } }),
  ANTHROPIC_MODEL: 'claude-sonnet-4-6',
}));

import { POST } from '@/app/api/meals/extract-recipe/route';

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/meals/extract-recipe', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/meals/extract-recipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          title: 'Tortilla',
          prep_minutes: 20,
          servings: 2,
          tags: ['rapido'],
          ingredients: [{ name: 'huevo', quantity: 4, unit: 'unidad', aisle: 'lacteos', optional: false }],
          steps: [{ body: 'Batir y cuajar', timer_min: null }],
          confidence: 0.9,
        }),
      }],
    });
  });

  it('rejects when neither image nor caption is provided', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('returns parsed JSON when model output is valid', async () => {
    const res = await POST(makeReq({ caption_text: 'tortilla de patata' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Tortilla');
    expect(body.ingredients[0].name).toBe('huevo');
  });

  it('marks system prompt with cache_control: ephemeral', async () => {
    await POST(makeReq({ caption_text: 'x' }));
    const arg = create.mock.calls[0][0];
    expect(arg.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(arg.model).toBe('claude-sonnet-4-6');
  });

  it('returns 502 on bad model JSON', async () => {
    create.mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json' }] });
    const res = await POST(makeReq({ caption_text: 'x' }));
    expect(res.status).toBe(502);
  });

  it('forwards image when image_base64 is present', async () => {
    await POST(makeReq({ image_base64: 'AAA', media_type: 'image/png', caption_text: 'x' }));
    const arg = create.mock.calls[0][0];
    const content = arg.messages[0].content;
    expect(content[0].type).toBe('image');
    expect(content[0].source.media_type).toBe('image/png');
  });
});
