export const MEAL_PASSES_PER_MONTH = 3;

export const MEAL_PASS_NOTES: string[] = [
  'tú eliges el sitio',
  'el que pierda, paga',
  'capricho sin remordimientos',
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

export interface MealPass {
  id: string;
  month_key: string;
  idx: number;
  redeemed: boolean;
  redeemed_at: string | null;
  place: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}
