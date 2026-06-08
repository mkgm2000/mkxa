import type { Athlete } from '@/lib/athlete-context';
import type { GeneratedWeek } from '@/lib/training/generated';

export interface RecentRegistro {
  week: number;
  day_key: string;
  completed: boolean | null;
  rpe: number | null;
  notes: string | null;
  week_note: string | null;
  /** Per-block manual overrides keyed by index into plan_jsonb.days[k].blocks.
   *  Tracks WHAT the athletes actually loaded/rested vs the prescription. */
  custom_blocks: Record<string, { name?: string; sets?: string; load?: string; rest?: string }> | null;
  /** Extras added by the athletes on top of the prescribed plan. */
  extra_blocks: Array<{ name: string; sets: string; load: string; rest?: string }> | null;
  /** Indices of prescribed blocks the athletes removed. */
  deleted_blocks: number[] | null;
}

export interface BuildDynamicContextArgs {
  athlete: Athlete;
  target_week: number;
  extra_prompt: string;
  previousConfirmed: GeneratedWeek | null;
  registros: RecentRegistro[];
}

const EXPECTED_DAYS_PER_WEEK = 4;

function collapseNotes(notes: string): string {
  return notes
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' / ');
}

function formatRegistros(registros: RecentRegistro[]): string {
  if (registros.length === 0) {
    return '(sin registros previos — devuelve baseline literal del Excel)';
  }

  // Group by week
  const byWeek = new Map<number, RecentRegistro[]>();
  for (const r of registros) {
    if (!byWeek.has(r.week)) byWeek.set(r.week, []);
    byWeek.get(r.week)!.push(r);
  }

  const weeks = Array.from(byWeek.keys()).sort((a, b) => a - b);
  const lines: string[] = [];

  for (const w of weeks) {
    const rows = byWeek.get(w)!.slice().sort((a, b) => a.day_key.localeCompare(b.day_key));
    const completedCount = rows.filter((r) => r.completed === true).length;
    const weekNote = rows.find((r) => r.week_note && r.week_note.trim().length > 0)?.week_note?.trim() ?? null;

    const headerBase = `### S${w} (${completedCount}/${EXPECTED_DAYS_PER_WEEK} sesiones completadas`;
    const header = weekNote
      ? `${headerBase}; nota semanal: "${collapseNotes(weekNote)}")`
      : `${headerBase})`;
    lines.push(header);

    for (const r of rows) {
      const completedMark = r.completed === true ? '✓' : '✗';
      const rpePart = r.completed === true && r.rpe != null ? ` RPE ${r.rpe}` : '';
      const statusLabel = r.completed === true ? completedMark + rpePart : `${completedMark} no completada`;
      const notesPart = r.notes && r.notes.trim().length > 0
        ? `  "${collapseNotes(r.notes)}"`
        : '';
      lines.push(`  ${r.day_key} [${statusLabel}]${notesPart}`);

      // Manual overrides — what the athletes actually did vs prescription.
      // Surfacing these is the only way Claude learns from user adjustments
      // when generating the next week.
      const cb = r.custom_blocks ?? {};
      const cbKeys = Object.keys(cb).sort((a, b) => Number(a) - Number(b));
      for (const k of cbKeys) {
        const entry = cb[k];
        if (!entry) continue;
        const parts = [
          entry.name ? `name="${entry.name}"` : null,
          entry.sets ? `sets="${entry.sets}"` : null,
          entry.load ? `load="${entry.load}"` : null,
          entry.rest ? `rest="${entry.rest}"` : null,
        ].filter(Boolean);
        if (parts.length === 0) continue;
        lines.push(`    · ajuste manual bloque[${k}]: ${parts.join(' ')}`);
      }

      const extras = r.extra_blocks ?? [];
      for (const e of extras) {
        const restPart = e.rest ? ` · rest="${e.rest}"` : '';
        lines.push(`    · extra añadido: "${e.name}" ${e.sets} @ ${e.load}${restPart}`);
      }

      const dels = r.deleted_blocks ?? [];
      if (dels.length > 0) {
        lines.push(`    · bloques eliminados (no los repongas si la razón persiste): índices [${dels.join(', ')}]`);
      }
    }
  }

  return lines.join('\n');
}

export function buildDynamicContext(a: BuildDynamicContextArgs): string {
  const extra = a.extra_prompt.trim() ? a.extra_prompt.trim() : '(ninguna)';
  const previous = a.previousConfirmed
    ? JSON.stringify(a.previousConfirmed)
    : '(no se generó previamente)';
  const regs = formatRegistros(a.registros);
  return [
    `ATLETA: ${a.athlete}`,
    `SEMANA OBJETIVO: ${a.target_week}`,
    `NOTAS EXTRA: "${extra}"`,
    '',
    `PLAN CONFIRMADO PREVIO (S${a.target_week - 1}):`,
    previous,
    '',
    `REGISTROS REALES HISTÓRICO COMPLETO (S1 → S${a.target_week - 1}, ${a.registros.length} entradas):`,
    regs,
    '',
    `Genera la SEMANA ${a.target_week} para ${a.athlete} aplicando las reglas estrictas.`,
  ].join('\n');
}
