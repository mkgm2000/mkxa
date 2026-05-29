import { describe, it, expect } from 'vitest';
import { RECEIPT_SYSTEM_PROMPT } from '@/lib/anthropic/prompts';

describe('RECEIPT_SYSTEM_PROMPT', () => {
  it('declares schema and strict-extraction rules', () => {
    expect(RECEIPT_SYSTEM_PROMPT).toContain('tickets/facturas');
    expect(RECEIPT_SYSTEM_PROMPT).toContain('"total"');
    expect(RECEIPT_SYSTEM_PROMPT).toContain('"category_suggested"');
    expect(RECEIPT_SYSTEM_PROMPT).toContain('"confidence"');
    expect(RECEIPT_SYSTEM_PROMPT).toMatch(/Sin texto explicativo/i);
  });

  it('enumerates all expense categories with example merchants', () => {
    for (const cat of ['comida', 'casa', 'transporte', 'ocio', 'salud', 'suscripciones', 'otros']) {
      expect(RECEIPT_SYSTEM_PROMPT).toContain(`"${cat}"`);
    }
    expect(RECEIPT_SYSTEM_PROMPT).toMatch(/Mercadona|Lidl|Carrefour/);
    expect(RECEIPT_SYSTEM_PROMPT).toMatch(/Repsol|Cepsa|gasolinera/i);
  });

  it('teaches es-ES number and date normalization', () => {
    expect(RECEIPT_SYSTEM_PROMPT).toMatch(/coma decimal/i);
    expect(RECEIPT_SYSTEM_PROMPT).toMatch(/YYYY-MM-DD/);
    expect(RECEIPT_SYSTEM_PROMPT).toMatch(/SUBTOTAL|BASE IMPONIBLE/);
  });

  it('forbids hallucination', () => {
    expect(RECEIPT_SYSTEM_PROMPT).toMatch(/NUNCA inventes/i);
  });
});
