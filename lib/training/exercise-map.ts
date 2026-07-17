// Maps a plan block name (Spanish, free-text as it appears in PLAN /
// generated weeks) to a dataset exercise id (English catalog). Curated by
// hand against the Battery — reviewed 2026-07-17. HYROX-station-specific and
// running-drill exercises the gym/free-weight dataset doesn't cover are left
// unmapped on purpose (no misleading gif) and fall back to text-only.
//
// See docs/EXERCISE_MEDIA.md for the curation notes and how to extend this.

/**
 * Normalise a block name to a lookup key: lowercase, strip accents, drop
 * parenthetical hints ("(Back Squat)") and battery codes ("F01"), collapse to
 * plain alphanumerics. Must stay in sync with the keys in EXERCISE_MAP.
 */
export function normalizeExercise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b[fhcrt]\d{2}\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const EXERCISE_MAP: Record<string, string> = {
  'banded skater hops': '3361',
  'burpee': '1160',
  'burpee to plate': '1160',
  'burpees': '1160',
  'calentamiento': '0685',
  'carrera en fatiga': '0685',
  'carrera z2 continua': '0685',
  'dead bug': '0276',
  'dominadas': '0652',
  'dominadas asistidas': '0017',
  'elevacion de gemelo': '1373',
  'farmer carry': '2133',
  'hanging knee raise': '0011',
  'kb swing': '0549',
  'kettlebell swing': '0549',
  'lunges': '1460',
  'med ball slam': '1354',
  'pallof': '0979',
  'peso muerto': '0032',
  'power clean': '0648',
  'press banca': '0025',
  'press mancuerna': '0426',
  'press pallof': '0979',
  'push press': '1700',
  'rdl': '0085',
  'rdl una pierna': '1756',
  'remo con barra': '0027',
  'remo en polea barra': '0027',
  'remo mancuerna': '0292',
  'russian twist': '0846',
  'russian twists': '0846',
  'sandbag lunges': '1460',
  'sentadilla': '0043',
  'sentadilla bulgara': '0410',
  'series 1000m': '0685',
  'series 400m': '0685',
  'series 500m': '0685',
  'single arm kb swing': '0549',
  'skater hops': '3361',
  'ski erg': '2142',
  'snatch con kb': '0542',
  'snatch kb': '0542',
  'tecnica de carrera': '0685',
  'thruster': '3305',
  'thrusters': '3305',
  'vuelta a la calma': '0685',
  'zancada hacia adelante': '1460',
};

// Unambiguous running tokens → always the run animation ("Carrera en fatiga",
// "Rodaje 40'", "Intervalos 400m"…).
const RUN_ALWAYS = /\b(carrera|trote|rodaje|intervalo|intervalos|sprint)\b/;
// "series"/"tempo" are generic strength vocab too ("Sentadilla tempo",
// "3 series x10"), so only treat them as running when a distance is present
// ("Series 600m", "Tempo 800m"). The 400/500/1000m variants hit the map first.
const RUN_MAYBE = /\b(series|tempo)\b/;
const HAS_DISTANCE = /\d+\s*m\b/;

/** Dataset exercise id for a plan block, or null when no honest match exists. */
export function matchExerciseId(blockName: string): string | null {
  const key = normalizeExercise(blockName);
  if (!key) return null;
  if (EXERCISE_MAP[key]) return EXERCISE_MAP[key];
  if (RUN_ALWAYS.test(key)) return '0685';
  if (RUN_MAYBE.test(key) && HAS_DISTANCE.test(key)) return '0685';
  return null;
}
