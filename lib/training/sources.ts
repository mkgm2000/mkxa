import { supabaseServer } from '@/lib/supabase/server';

export const TRAINING_SOURCE_SLUGS = [
  'pdf_tema5_cualidades',
  'pdf_tema6_concurrente',
  'pdf_tema7_macro',
  'pdf_macro_meso_micro',
  'pdf_periodizacion_tradicional_inversa',
  'pdf_rulebook_hyrox_doubles',
  'xlsx_master_23s',
  'xlsx_bateria_ejercicios',
] as const;

export type TrainingSourceSlug = (typeof TRAINING_SOURCE_SLUGS)[number];

export interface TrainingSourceRow {
  id: TrainingSourceSlug;
  file_id: string;
  filename: string;
}

export async function readTrainingSources(): Promise<TrainingSourceRow[]> {
  const { data, error } = await supabaseServer()
    .from('training_sources')
    .select('id,file_id,filename')
    .in('id', TRAINING_SOURCE_SLUGS as unknown as string[]);
  if (error) throw new Error(`training_sources read failed: ${error.message}`);
  return (data ?? []) as TrainingSourceRow[];
}
