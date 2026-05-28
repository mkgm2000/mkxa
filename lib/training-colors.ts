// RPE 1..10 colour map. Source: legacy/index.html RC constant.
export const RC: Record<number, string> = {
  1: '#22c55e',
  2: '#22c55e',
  3: '#4ade80',
  4: '#84cc16',
  5: '#eab308',
  6: '#f97316',
  7: '#f97316',
  8: '#ef4444',
  9: '#dc2626',
  10: '#991b1b',
};

export function rpeColor(rpe: number | null | undefined): string | null {
  if (rpe == null) return null;
  return RC[rpe] ?? null;
}
