'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type { Aisle, ShoppingItem } from '@/lib/meals/recipes';

export function useShoppingList(weekStart: string | null) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!weekStart) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabaseClient()
      .from('shopping_list')
      .select('*')
      .eq('week_start', weekStart)
      .eq('archived', false)
      .order('position', { ascending: true });
    if (error) { saveState.getState().set('error'); setLoading(false); return; }
    setItems((data as ShoppingItem[]) ?? []);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleChecked = useCallback(async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const next = !target.checked;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: next } : i)));
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('shopping_list')
      .update({ checked: next })
      .eq('id', id);
    if (error) {
      saveState.getState().set('error');
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !next } : i)));
      return;
    }
    saveState.getState().set('saved');
  }, [items]);

  const editItem = useCallback(async (id: string, patch: Partial<ShoppingItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('shopping_list')
      .update(patch)
      .eq('id', id);
    if (error) { saveState.getState().set('error'); await refresh(); return; }
    saveState.getState().set('saved');
  }, [refresh]);

  const deleteItem = useCallback(async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== id));
    saveState.getState().set('saving');
    const { error } = await supabaseClient().from('shopping_list').delete().eq('id', id);
    if (error) { saveState.getState().set('error'); setItems(prev); return; }
    saveState.getState().set('saved');
  }, [items]);

  const addManual = useCallback(async (input: { name: string; quantity: number | null; unit: string | null; aisle: Aisle }) => {
    if (!weekStart) return;
    saveState.getState().set('saving');
    const maxPos = items.reduce((m, i) => Math.max(m, i.position), -1);
    const { data, error } = await supabaseClient()
      .from('shopping_list')
      .insert({
        week_start: weekStart,
        name: input.name.trim(),
        quantity: input.quantity,
        unit: input.unit,
        aisle: input.aisle,
        source: 'manual',
        recipe_ids: [],
        checked: false,
        archived: false,
        position: maxPos + 1,
      })
      .select('*')
      .single();
    if (error || !data) { saveState.getState().set('error'); return; }
    setItems((prev) => [...prev, data as ShoppingItem]);
    saveState.getState().set('saved');
  }, [items, weekStart]);

  const finish = useCallback(async (input: {
    total: number;
    paid_by: 'MK' | 'Xabi' | 'Compartido';
    merchant?: string | null;
  }) => {
    if (!weekStart) return { error: 'no week' as const };
    saveState.getState().set('saving');
    const res = await fetch('/api/meals/finish-shopping', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        week_start: weekStart,
        total: input.total,
        paid_by: input.paid_by,
        merchant: input.merchant ?? null,
      }),
    });
    if (!res.ok) { saveState.getState().set('error'); return { error: await res.text() }; }
    saveState.getState().set('saved');
    await refresh();
    return (await res.json()) as { expense_id: string };
  }, [refresh, weekStart]);

  return { items, loading, refresh, toggleChecked, editItem, deleteItem, addManual, finish };
}
