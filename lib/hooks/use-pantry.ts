'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import { type Aisle, type PantryItem, aisleOrder } from '@/lib/meals/recipes';

export function usePantry() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseClient()
      .from('pantry_items')
      .select('*')
      .order('name', { ascending: true });
    if (error) { saveState.getState().set('error'); setLoading(false); return; }
    const sorted = ((data as PantryItem[]) ?? [])
      .slice()
      .sort((a, b) => (aisleOrder[a.aisle] - aisleOrder[b.aisle]) || a.name.localeCompare(b.name));
    setItems(sorted);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleInStock = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const next = !item.in_stock;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, in_stock: next } : i)));
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('pantry_items')
      .update({ in_stock: next, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      saveState.getState().set('error');
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, in_stock: !next } : i)));
      return;
    }
    saveState.getState().set('saved');
  }, [items]);

  const addItem = useCallback(async (input: { name: string; aisle: Aisle; units?: number | null }) => {
    saveState.getState().set('saving');
    const units = typeof input.units === 'number' && input.units > 0 ? Math.trunc(input.units) : null;
    const { data, error } = await supabaseClient()
      .from('pantry_items')
      .insert({ name: input.name.trim().toLowerCase(), aisle: input.aisle, in_stock: true, units })
      .select('*')
      .single();
    if (error || !data) { saveState.getState().set('error'); return; }
    setItems((prev) => {
      const next = [...prev, data as PantryItem];
      return next.sort((a, b) => (aisleOrder[a.aisle] - aisleOrder[b.aisle]) || a.name.localeCompare(b.name));
    });
    saveState.getState().set('saved');
  }, []);

  return { items, loading, refresh, toggleInStock, addItem };
}
