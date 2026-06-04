export function todayISO(now: Date = new Date()): string {
  return toISO(now);
}

export function startOfWeekISO(d: Date): string {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const monday = new Date(Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff
  ));
  return toISO(monday);
}

export function addDaysISO(startISO: string, days: number): string {
  const [y, m, d] = startISO.split('-').map(Number);
  return toISO(new Date(Date.UTC(y, m - 1, d + days)));
}

// ISO 8601 week number — Thursday rule. Matches what people write down
// (semana 24, semana 25, etc.) and what date pickers in Excel produce.
export function isoWeekNumber(startISO: string): number {
  const [y, m, d] = startISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Shift to the Thursday of the same ISO week so the year/week math
  // crosses Jan 1 correctly.
  dt.setUTCDate(dt.getUTCDate() + 3 - ((dt.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const diffMs = dt.getTime() - firstThursday.getTime();
  return 1 + Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

export function weekDays(startISO: string): string[] {
  const [y, m, d] = startISO.split('-').map(Number);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(Date.UTC(y, m - 1, d + i));
    out.push(toISO(dd));
  }
  return out;
}

function toISO(d: Date): string {
  const y  = d.getUTCFullYear();
  const m  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
