import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (_client) return _client;
  const raw = process.env.ANTHROPIC_API_KEY;
  if (!raw) throw new Error('Missing ANTHROPIC_API_KEY');
  // Vercel env vars can pick up trailing whitespace, newlines, or a literal
  // "\n" suffix when the value is pasted from a multi-line clipboard. Anthropic
  // keys only use [A-Za-z0-9_-], so strip anything else from both ends.
  const apiKey = raw.replace(/[^A-Za-z0-9_-]+$/, '').replace(/^[^A-Za-z0-9_-]+/, '');
  _client = new Anthropic({ apiKey });
  return _client;
}

export const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
