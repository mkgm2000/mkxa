// Minimal wrapper for the Anthropic Files API. SDK v0.27 does not expose
// it yet, so we hit the REST endpoint directly with the beta header.

const FILES_URL = 'https://api.anthropic.com/v1/files';
const FILES_API_BETA = 'files-api-2025-04-14';
const ANTHROPIC_VERSION = '2023-06-01';

export interface UploadedFile {
  id: string;
  type: string;
  filename: string;
  size_bytes: number;
  created_at: string;
}

export async function uploadFile(args: {
  filepath: string;
  filename: string;
  mimeType: string;
}): Promise<UploadedFile> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  const fs = await import('node:fs/promises');
  const buf = await fs.readFile(args.filepath);
  const blob = new Blob([buf], { type: args.mimeType });

  const form = new FormData();
  form.append('file', blob, args.filename);

  const res = await fetch(FILES_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-beta': FILES_API_BETA,
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Files API upload failed (${res.status}): ${text}`);
  }
  return (await res.json()) as UploadedFile;
}
