/**
 * One-off uploader for the 6 training-source files.
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... \
 *   NEXT_PUBLIC_SUPABASE_URL=...    \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *     npm run upload-training-sources
 *
 * Idempotent: upserts on (id) so re-running re-uploads and rotates file_ids.
 */

import 'dotenv/config';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { uploadFile } from '../lib/anthropic/files';
import { TRAINING_SOURCE_SLUGS, type TrainingSourceSlug } from '../lib/training/sources';

interface SourceDef {
  slug: TrainingSourceSlug;
  filename: string;
  description: string;
  mimeType: string;
}

const SOURCES: SourceDef[] = [
  { slug: 'pdf_tema5_cualidades',                  filename: 'pdf_tema5_cualidades.pdf',                  description: 'UFV Tema 5: cualidades complementarias',           mimeType: 'application/pdf' },
  { slug: 'pdf_tema6_concurrente',                 filename: 'pdf_tema6_concurrente.pdf',                 description: 'UFV Tema 6: entrenamiento concurrente',            mimeType: 'application/pdf' },
  { slug: 'pdf_tema7_macro',                       filename: 'pdf_tema7_macro.pdf',                       description: 'UFV Tema 7: macrociclos',                          mimeType: 'application/pdf' },
  { slug: 'pdf_macro_meso_micro',                  filename: 'pdf_macro_meso_micro.pdf',                  description: 'UFV macro/meso/micro estructura jerárquica',       mimeType: 'application/pdf' },
  { slug: 'pdf_periodizacion_tradicional_inversa', filename: 'pdf_periodizacion_tradicional_inversa.pdf', description: 'UFV periodización tradicional e inversa',          mimeType: 'application/pdf' },
  { slug: 'pdf_rulebook_hyrox_doubles',            filename: 'pdf_rulebook_hyrox_doubles.pdf',            description: 'HYROX Doubles official rulebook',                  mimeType: 'application/pdf' },
  { slug: 'xlsx_master_23s',                       filename: 'xlsx_master_23s.txt',                       description: 'MKXA 23S v3 master plan (xlsx convertido a text/plain)', mimeType: 'text/plain' },
];

async function main() {
  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPA || !ANON) throw new Error('Missing Supabase env');

  const supabase = createClient(SUPA, ANON);
  const root = path.resolve(__dirname, '..');
  const sourcesDir = path.join(root, 'docs', 'training-sources');

  for (const def of SOURCES) {
    const filepath = path.join(sourcesDir, def.filename);
    console.log(`Uploading ${def.slug} ← ${def.filename} …`);
    const uploaded = await uploadFile({ filepath, filename: def.filename, mimeType: def.mimeType });
    console.log(`  → file_id=${uploaded.id} bytes=${uploaded.size_bytes}`);

    const { error } = await supabase.from('training_sources').upsert(
      { id: def.slug, file_id: uploaded.id, filename: def.filename, description: def.description },
      { onConflict: 'id' },
    );
    if (error) throw new Error(`Supabase upsert failed for ${def.slug}: ${error.message}`);
  }
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });

void TRAINING_SOURCE_SLUGS;
