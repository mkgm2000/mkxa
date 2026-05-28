import type { Athlete } from '@/lib/athlete-context';

export const CATEGORIES = [
  'comida',
  'casa',
  'transporte',
  'ocio',
  'salud',
  'suscripciones',
  'otros',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type PaidBy = 'MK' | 'Xabi' | 'Compartido';

export const PAID_BY_OPTIONS: PaidBy[] = ['MK', 'Xabi', 'Compartido'];

export interface ReceiptItem {
  name: string;
  price: number | null;
}

export interface ReceiptData {
  total: number | null;
  date: string | null;
  merchant: string | null;
  category_suggested: Category | null;
  items: ReceiptItem[];
  confidence: number | null;
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: Category;
  date: string;
  paid_by: PaidBy;
  description: string | null;
  merchant: string | null;
  receipt_url: string | null;
  receipt_data: ReceiptData | null;
  created_by: Athlete;
  created_at: string;
  updated_at: string;
}

export type NewExpense = Omit<
  Expense,
  'id' | 'created_at' | 'updated_at'
>;

const LABELS: Record<Category, string> = {
  comida:        'Comida',
  casa:          'Casa',
  transporte:    'Transporte',
  ocio:          'Ocio',
  salud:         'Salud',
  suscripciones: 'Suscripciones',
  otros:         'Otros',
};

export function categoryLabel(c: Category): string {
  return LABELS[c];
}

export function categoryColorClass(c: Category): string {
  return `bg-cat-${c}`;
}

export function formatEuros(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
