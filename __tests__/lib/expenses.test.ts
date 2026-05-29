import { describe, it, expect } from 'vitest';
import {
  CATEGORIES,
  categoryLabel,
  categoryColorClass,
  type Category,
} from '@/lib/expenses';

describe('CATEGORIES', () => {
  it('lists 7 categories in fixed order', () => {
    expect(CATEGORIES).toEqual([
      'comida', 'casa', 'transporte', 'ocio',
      'salud', 'suscripciones', 'otros',
    ]);
  });
});

describe('categoryLabel', () => {
  it('returns Spanish label for each category', () => {
    expect(categoryLabel('comida')).toBe('Comida');
    expect(categoryLabel('casa')).toBe('Casa');
    expect(categoryLabel('transporte')).toBe('Transporte');
    expect(categoryLabel('ocio')).toBe('Ocio');
    expect(categoryLabel('salud')).toBe('Salud');
    expect(categoryLabel('suscripciones')).toBe('Suscripciones');
    expect(categoryLabel('otros')).toBe('Otros');
  });
});

describe('categoryColorClass', () => {
  it('returns bg-cat-{category} Tailwind class', () => {
    for (const c of CATEGORIES) {
      expect(categoryColorClass(c as Category)).toBe(`bg-cat-${c}`);
    }
  });
});
