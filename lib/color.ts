/**
 * Linear interpolation between two #rrggbb hex strings.
 * t is clamped to [0,1]. Output is lowercase #rrggbb.
 */
export function lerpHex(a: string, b: string, t: number): string {
  const ct = Math.min(1, Math.max(0, t));
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const lerpChan = (shift: number) => {
    const av = (pa >> shift) & 0xff;
    const bv = (pb >> shift) & 0xff;
    return Math.round(av + (bv - av) * ct);
  };
  const r = lerpChan(16);
  const g = lerpChan(8);
  const bl = lerpChan(0);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}
