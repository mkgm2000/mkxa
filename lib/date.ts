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
