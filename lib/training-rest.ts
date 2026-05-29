// Rest hint heuristic. Port of legacy getRest().
export function getRest(name: string, sets: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('plancha')) return '45-60"';
  if (n.includes('sled')) return '90"';
  if (n.includes('farmer') || n.includes('carry')) return '60-90"';
  if (n.includes('series') || n.includes('400m') || n.includes('800m')) return '90" caminando';
  if (
    n.includes('calentamiento') ||
    n.includes('vuelta') ||
    n.includes('movilidad') ||
    n.includes('z2')
  ) {
    return '—';
  }
  if (n.includes('burpee')) return '60"';
  if (n.includes('wall ball')) return '45-60"';
  if (n.includes('dominadas')) return '90"';
  if (sets) {
    const m = sets.match(/x(\d+)/);
    if (m) {
      const r = parseInt(m[1], 10);
      if (r <= 3) return "3-4'";
      if (r <= 5) return "2-3'";
      if (r <= 8) return '90-120"';
      return '60-90"';
    }
  }
  return '90"';
}
