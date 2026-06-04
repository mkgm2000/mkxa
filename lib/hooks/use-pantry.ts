'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import { type Aisle, type PantryItem, aisleOrder } from '@/lib/meals/recipes';

// Force first character uppercase; the rest stays as the user typed it
// (or as the OFF product name came in). Empty strings pass through.
function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase('es-ES') + s.slice(1);
}

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

  const addItem = useCallback(async (input: {
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
  }) => {
    saveState.getState().set('saving');
    const units = typeof input.units === 'number' && input.units > 0 ? Math.trunc(input.units) : null;
    const { data, error } = await supabaseClient()
      .from('pantry_items')
      .insert({
        name: capitalise(input.name.trim()),
        aisle: input.aisle,
        in_stock: true,
        units,
        image_url: input.image_url ?? null,
        off_barcode: input.off_barcode ?? null,
        kcal_100g: input.kcal_100g ?? null,
        protein_100g: input.protein_100g ?? null,
        carbs_100g: input.carbs_100g ?? null,
        fat_100g: input.fat_100g ?? null,
        macros_source: input.macros_source ?? null,
      })
      .select('*')
      .single();
    if (error || !data) { saveState.getState().set('error'); return; }
    setItems((prev) => {
      const next = [...prev, data as PantryItem];
      return next.sort((a, b) => (aisleOrder[a.aisle] - aisleOrder[b.aisle]) || a.name.localeCompare(b.name));
    });
    saveState.getState().set('saved');
  }, []);

  const editItem = useCallback(async (id: string, patch: { name?: string; units?: number | null }) => {
    saveState.getState().set('saving');
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof patch.name === 'string') payload.name = capitalise(patch.name.trim());
    if (patch.units !== undefined) {
      payload.units = typeof patch.units === 'number' && patch.units > 0 ? Math.trunc(patch.units) : null;
    }
    const { data, error } = await supabaseClient()
      .from('pantry_items')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) { saveState.getState().set('error'); return; }
    setItems((prev) => prev.map((i) => (i.id === id ? (data as PantryItem) : i)));
    saveState.getState().set('saved');
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    saveState.getState().set('saving');
    const { error } = await supabaseClient().from('pantry_items').delete().eq('id', id);
    if (error) { saveState.getState().set('error'); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
    saveState.getState().set('saved');
  }, []);

  return { items, loading, refresh, toggleInStock, addItem, editItem, deleteItem };
}
