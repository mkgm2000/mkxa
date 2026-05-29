import { describe, it, expect } from 'vitest';
import { TRAINING_SYSTEM_PROMPT } from '@/lib/anthropic/training-prompts';

describe('TRAINING_SYSTEM_PROMPT', () => {
  it('starts with the coach disclaimer', () => {
    expect(TRAINING_SYSTEM_PROMPT.startsWith('Eres el coach asistente HYROX')).toBe(true);
  });

  it('lists the strict rules numbered 1-6', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(TRAINING_SYSTEM_PROMPT).toContain(`${n}.`);
    }
  });

  it('declares the JSON schema with the GeneratedWeek field names', () => {
    for (const field of ['"athlete"', '"week"', '"weekly_note"', '"days"', '"rationale"', '"blocks"']) {
      expect(TRAINING_SYSTEM_PROMPT).toContain(field);
    }
  });
});
