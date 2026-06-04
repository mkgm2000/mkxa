// Helpers for mapping Mercadona search results onto our domain.

import type { Aisle } from '@/lib/meals/recipes';

// Mercadona top-level categories → our supermarket aisle. Mercadona has
// a 3-level tree; the top is always the most consistent so we lean on
// that. Defaults to `despensa` for anything we don't recognise.
const TOP_TO_AISLE: Record<string, Aisle> = {
  'Fruta y verdura':      'frutas_verduras',
  'Pescado':              'pescaderia',
  'Pescados':             'pescaderia',
  'Pescadería':           'pescaderia',
  'Carne':                'carniceria',
  'Carnes':               'carniceria',
  'Carnicería':           'carniceria',
  'Charcutería':          'carniceria',
  'Pollería':             'carniceria',
  'Lácteos, huevos y bebidas vegetales': 'lacteos',
  'Lácteos y huevos':     'lacteos',
  'Lácteos':              'lacteos',
  'Panadería y pastelería': 'panaderia',
  'Panadería':            'panaderia',
  'Bollería y pastelería': 'panaderia',
  'Congelados':           'congelados',
  'Bebidas':              'bebidas',
  'Aguas y refrescos':    'bebidas',
  'Cerveza, vino y licores': 'bebidas',
  'Limpieza y hogar':     'limpieza',
  'Limpieza':             'limpieza',
  'Cuidado personal':     'limpieza',
  'Higiene':              'limpieza',
};

export function aisleFromMercadonaCategory(top: string | null | undefined): Aisle {
  if (!top) return 'despensa';
  return TOP_TO_AISLE[top] ?? 'despensa';
}

// Force first letter uppercase (matches pantry/shopping name convention).
export function capitaliseProductName(input: string): string {
  const s = input.trim();
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase('es-ES') + s.slice(1);
}
