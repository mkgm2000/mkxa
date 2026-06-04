'use client';

import { useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { ShoppingSectionHeader } from './ShoppingSectionHeader';
import { PantryItemRow } from './PantryItemRow';
import { PantryAddRow } from './PantryAddRow';
import { PantryItemActions } from './PantryItemActions';
import { EmptyState } from '@/components/ui/EmptyState';
import { type Aisle, type PantryItem, aisleOrder } from '@/lib/meals/recipes';

interface PantryListProps {
  items: PantryItem[];
  onToggle: (id: string) => void;
  onAdd?: (input: {
    name: string;
    aisle: Aisle;
    units?: number | null;
    image_url?: string | null;
    off_barcode?: string | null;
    kcal_100g?: number | null;
    protein_100g?: number | null;
    carbs_100g?: number | null;
    fat_100g?: number | null;
    macros_source?: 'mercadona' | 'off' | 'estimate' | 'manual' | null;
  }) => Promise<void> | void;
  /** Optional — when provided, long-press on an item opens an edit/delete sheet. */
  onEdit?: (id: string, patch: { name?: string; units?: number | null }) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}

export function PantryList({ items, onToggle, onAdd, onEdit, onDelete }: PantryListProps) {
  const [actionItem, setActionItem] = useState<PantryItem | null>(null);

  const sections = useMemo(() => {
    const map = new Map<Aisle, PantryItem[]>();
    for (const it of items) {
      const arr = map.get(it.aisle) ?? [];
      arr.push(it);
      map.set(it.aisle, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => aisleOrder[a] - aisleOrder[b])
      .map(([aisle, list]) => ({
        aisle,
        items: list.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [items]);

  return (
    <div className="flex flex-col gap-2 pt-2">
      {onAdd && <PantryAddRow onAdd={onAdd} />}
      {sections.length === 0 && (
        <div className="px-4 pt-3">
          <EmptyState
            icon={Package}
            title="Despensa vacía"
            subtitle="Añade lo que ya tienes en casa para no comprarlo dos veces."
          />
        </div>
      )}
      {sections.map(({ aisle, items: rows }) => (
        <div key={aisle}>
          <ShoppingSectionHeader aisle={aisle} />
          <div className="flex flex-col gap-1.5 px-2">
            {rows.map((it) => (
              <PantryItemRow
                key={it.id}
                item={it}
                onToggle={onToggle}
                onLongPress={onEdit && onDelete ? setActionItem : undefined}
              />
            ))}
          </div>
        </div>
      ))}
      {actionItem && onEdit && onDelete && (
        <PantryItemActions
          item={actionItem}
          onClose={() => setActionItem(null)}
          onSave={(patch) => onEdit(actionItem.id, patch)}
          onDelete={() => onDelete(actionItem.id)}
        />
      )}
    </div>
  );
}
