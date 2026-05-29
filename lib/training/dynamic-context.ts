import type { Athlete } from '@/lib/athlete-context';
import type { GeneratedWeek } from '@/lib/training/generated';

export interface RecentRegistro {
  week: number;
  day_key: string;
  completed: boolean | null;
  rpe: number | null;
  notes: string | null;
  week_note: string | null;
}

export interface BuildDynamicContextArgs {
  athlete: Athlete;
  target_week: number;
  extra_prompt: string;
  previousConfirmed: GeneratedWeek | null;
  registros: RecentRegistro[];
}

export function buildDynamicContext(a: BuildDynamicContextArgs): string {
  const extra = a.extra_prompt.trim() ? a.extra_prompt.trim() : '(ninguna)';
  const previous = a.previousConfirmed
    ? JSON.stringify(a.previousConfirmed)
    : '(no se generó previamente)';
  const regs = a.registros.length > 0
    ? JSON.stringify(a.registros)
    : '(sin registros)';
  return [
    `ATLETA: ${a.athlete}`,
    `SEMANA OBJETIVO: ${a.target_week}`,
    `NOTAS EXTRA: "${extra}"`,
    '',
    `PLAN CONFIRMADO PREVIO (S${a.target_week - 1}):`,
    previous,
    '',
    'REGISTROS REALES ÚLTIMAS 2 SEMANAS:',
    regs,
    '',
    `Genera la SEMANA ${a.target_week} para ${a.athlete} aplicando las reglas estrictas.`,
  ].join('\n');
}
