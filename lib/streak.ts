export interface CompletedRow {
  week: number;
  day_key: string;
  completed: boolean | null;
}

/**
 * Consecutive ISO-plan weeks (counting backwards from `currentWeek`) with
 * at least one `completed = true` row. A missing/uncompleted week breaks
 * the streak.
 */
export function computeWeekStreak(rows: CompletedRow[], currentWeek: number): number {
  const weeks = new Set<number>();
  for (const r of rows) if (r.completed === true) weeks.add(r.week);
  let streak = 0;
  for (let w = currentWeek; w >= 1; w--) {
    if (weeks.has(w)) streak++;
    else break;
  }
  return streak;
}
