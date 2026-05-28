import { describe, it, expect } from 'vitest';
import { RECEIPT_SYSTEM_PROMPT } from '@/lib/anthropic/prompts';

describe('RECEIPT_SYSTEM_PROMPT', () => {
  it('matches the canonical spec text', () => {
    expect(RECEIPT_SYSTEM_PROMPT).toContain('extractor de datos de tickets/facturas en español');
    expect(RECEIPT_SYSTEM_PROMPT).toContain('"total": number');
    expect(RECEIPT_SYSTEM_PROMPT).toContain('"category_suggested"');
    expect(RECEIPT_SYSTEM_PROMPT).toContain('"confidence": number');
    expect(RECEIPT_SYSTEM_PROMPT).toContain('Sin texto explicativo');
  });
});
