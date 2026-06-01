export const MEAL_PASSES_PER_MONTH = 4;

export const MEAL_PASS_NOTES: string[] = [
  'tú eliges el sitio',
  'el que pierda, paga',
  'capricho sin remordimientos',
  'postre obligatorio',
];

export const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatRedeemDate(d: Date): string {
  return `${d.getDate()} ${MESES_ES[d.getMonth()].slice(0, 3)}`;
}

export type MealPassKind = 'dine' | 'delivery';

export interface MealPass {
  id: string;
  month_key: string;
  idx: number;
  redeemed: boolean;
  redeemed_at: string | null;
  place: string | null;
  kind: MealPassKind;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface MealPassTheme {
  accent: string;
  stub: string;
  stubFg: string;
  b1: string;
  b2: string;
  blobDark: string;
  mood: 'smile' | 'grin' | 'flat';
}

/**
 * Per-pass colourful themes, matched 1:1 with the redesign spec (see
 * `.claude/jobs/8da9e59a/mp2.html`, the `THEMES` array). Order matters:
 * THEMES[idx] is the look for pass `idx`.
 */
export const MEAL_PASS_THEMES: MealPassTheme[] = [
  {
    accent: '#E89A1C',
    stub: 'linear-gradient(140deg,#F7C24A,#F0A41E)',
    stubFg: '#3a2a05',
    b1: '#FFE08A',
    b2: '#F2A91E',
    blobDark: '#7a4d05',
    mood: 'grin',
  },
  {
    accent: '#E64C7F',
    stub: 'linear-gradient(140deg,#FF7FA8,#F0497F)',
    stubFg: '#fff',
    b1: '#FFB3CC',
    b2: '#F0497F',
    blobDark: '#8a1a44',
    mood: 'smile',
  },
  {
    accent: '#1FA98A',
    stub: 'linear-gradient(140deg,#79E2C4,#28BE9C)',
    stubFg: '#05352a',
    b1: '#A9F0DC',
    b2: '#28BE9C',
    blobDark: '#075c47',
    mood: 'grin',
  },
  {
    accent: '#7E55E0',
    stub: 'linear-gradient(140deg,#B79BF5,#8A5FE6)',
    stubFg: '#fff',
    b1: '#D7C5FB',
    b2: '#8A5FE6',
    blobDark: '#3d2080',
    mood: 'smile',
  },
];
