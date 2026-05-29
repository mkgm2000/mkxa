'use client';

import { useMemo } from 'react';
import { ShoppingSectionHeader } from './ShoppingSectionHeader';
import { PantryItemRow } from './PantryItemRow';
import { type Aisle, type PantryItem, aisleOrder } from '@/lib/meals/recipes';

interface PantryListProps {
  items: PantryItem[];
  onToggle: (id: string) => void;
}

export function PantryList({ items, onToggle }: PantryListProps) {
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

  if (sections.length === 0) {
    return <p className="px-2 pt-4 text-center text-[13px] text-ink-muted">Despensa vacía.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {sections.map(({ aisle, items: rows }) => (
        <div key={aisle}>
          <ShoppingSectionHeader aisle={aisle} />
          <div className="flex flex-col gap-1.5 px-2">
            {rows.map((it) => <PantryItemRow key={it.id} item={it} onToggle={onToggle} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
