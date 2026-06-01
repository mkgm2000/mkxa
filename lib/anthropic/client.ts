import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (_client) return _client;
  const raw = process.env.ANTHROPIC_API_KEY;
  if (!raw) throw new Error('Missing ANTHROPIC_API_KEY');
  // Vercel env vars can pick up trailing whitespace, real newlines, OR a
  // LITERAL "\n" suffix (backslash + n) when the value is pasted from a
  // multi-line clipboard. Anthropic keys only use [A-Za-z0-9_-], so just grab
  // the longest prefix that matches that alphabet. This neutralises any junk
  // including the literal-backslash-n case where the old regex failed to trim.
  const apiKey = raw.trim().match(/^[A-Za-z0-9_-]+/)?.[0] ?? '';
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is malformed (no key prefix found)');
  _client = new Anthropic({ apiKey });
  return _client;
}

export const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
