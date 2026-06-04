import { inferAisle } from '@/lib/meals/ingredient-aisles';
import type { Aisle } from '@/lib/meals/recipes';

/**
 * Guess the supermarket aisle for a scanned ticket line.
 *
 * Mercadona tickets tend to use ALL-CAPS abbreviations ("LECH PASCUAL",
 * "BACON AHUM", "TOMATE FRITO"). `inferAisle` matches lowercase substrings
 * so we lowercase first; the abbreviations still hit on the meaningful stem.
 */
export function categoriseTicketItem(name: string): Aisle {
  return inferAisle(name);
}

/** Title-case the first letter, keep the rest lowercased (mirrors usePantry capitalise). */
export function ticketNameToPantryName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase('es-ES') + trimmed.slice(1).toLocaleLowerCase('es-ES');
}
