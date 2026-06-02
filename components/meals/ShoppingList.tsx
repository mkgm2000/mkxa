'use client';

import { useMemo, useState } from 'react';
import { ShoppingSectionHeader } from './ShoppingSectionHeader';
import { ShoppingItemRow } from './ShoppingItemRow';
import { AddItemRow } from './AddItemRow';
import { ShoppingItemActions } from './ShoppingItemActions';
import {
  type Aisle,
  type PantryItem,
  type ShoppingItem,
  aisleOrder,
  normalizeIngredientName,
} from '@/lib/meals/recipes';

interface ShoppingListProps {
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onAddManual: (input: { name: string; quantity: number | null; unit: string | null; aisle: Aisle }) => Promise<void> | void;
  /** Optional — when provided, long-press on an item opens an edit/delete sheet. */
  onEdit?: (id: string, patch: Partial<ShoppingItem>) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  recipeNamesById?: Record<string, string>;
  pantryItems?: PantryItem[];
}

export function ShoppingList({ items, onToggle, onAddManual, onEdit, onDelete, recipeNamesById, pantryItems = [] }: ShoppingListProps) {
  const [actionItem, setActionItem] = useState<ShoppingItem | null>(null);
  const inStockNames = useMemo(() => {
    const set = new Set<string>();
    for (const p of pantryItems) {
      if (p.in_stock) set.add(normalizeIngredientName(p.name));
    }
    return set;
  }, [pantryItems]);

  const { toBuy, alreadyAtHome } = useMemo(() => {
    const toBuy: ShoppingItem[] = [];
    const alreadyAtHome: ShoppingItem[] = [];
    for (const it of items) {
      if (inStockNames.has(normalizeIngredientName(it.name))) alreadyAtHome.push(it);
      else toBuy.push(it);
    }
    return { toBuy, alreadyAtHome };
  }, [items, inStockNames]);

  const sections = useMemo(() => {
    const map = new Map<Aisle, ShoppingItem[]>();
    for (const it of toBuy) {
      const arr = map.get(it.aisle) ?? [];
      arr.push(it);
      map.set(it.aisle, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => aisleOrder[a] - aisleOrder[b])
      .map(([aisle, list]) => ({
        aisle,
        items: list.sort((a, b) => a.position - b.position),
      }));
  }, [toBuy]);

  const alreadyAtHomeSorted = useMemo(
    () => [...alreadyAtHome].sort((a, b) => {
      const ao = aisleOrder[a.aisle] - aisleOrder[b.aisle];
      if (ao !== 0) return ao;
      return a.position - b.position;
    }),
    [alreadyAtHome],
  );

  const checked = toBuy.filter((i) => i.checked).length;
  const total = toBuy.length;
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100);

  const bothEmpty = sections.length === 0 && alreadyAtHomeSorted.length === 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="px-2">
        <div className="mb-1 flex items-baseline justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Progreso</p>
          <p className="text-[12px] font-bold tabular-nums text-ink-muted">{checked} / {total}</p>
        </div>
        <div className="h-[2px] w-full overflow-hidden rounded-full bg-ink-soft" aria-hidden>
          <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="px-2 pt-3">
        <AddItemRow onAdd={onAddManual} />
      </div>
      {sections.map(({ aisle, items: rows }) => (
        <div key={aisle}>
          <ShoppingSectionHeader aisle={aisle} />
          <div className="flex flex-col gap-1.5 px-2">
            {rows.map((it) => (
              <ShoppingItemRow
                key={it.id}
                item={it}
                onToggle={onToggle}
                onLongPress={onEdit && onDelete ? setActionItem : undefined}
                recipeNamesById={recipeNamesById}
              />
            ))}
          </div>
        </div>
      ))}
      {alreadyAtHomeSorted.length > 0 && (
        <div>
          <div className="px-2 pt-4 pb-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted opacity-70">
              Ya tienes en casa
            </p>
          </div>
          <div className="flex flex-col gap-1.5 px-2">
            {alreadyAtHomeSorted.map((it) => (
              <ShoppingItemRow
                key={it.id}
                item={it}
                onToggle={onToggle}
                onLongPress={onEdit && onDelete ? setActionItem : undefined}
                recipeNamesById={recipeNamesById}
                alreadyAtHome
              />
            ))}
          </div>
        </div>
      )}
      {bothEmpty && (
        <p className="px-2 pt-4 text-center text-[13px] text-ink-muted">Lista vacía. Genera desde el plan o añade items.</p>
      )}
      {actionItem && onEdit && onDelete && (
        <ShoppingItemActions
          item={actionItem}
          onClose={() => setActionItem(null)}
          onSave={(patch) => onEdit(actionItem.id, patch)}
          onDelete={() => onDelete(actionItem.id)}
        />
      )}
    </div>
  );
}
