'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type { Aisle, ShoppingItem } from '@/lib/meals/recipes';

// How long a row id is considered "recently mutated locally" — used to dedup
// the realtime echo of our own optimistic write so we don't double-apply.
const LOCAL_MUTATION_TTL_MS = 2000;

export function useShoppingList(weekStart: string | null) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Track ids the local client just mutated so realtime echoes can be skipped.
  const recentLocalMutations = useRef<Map<string, number>>(new Map());
  const markLocal = useCallback((id: string) => {
    recentLocalMutations.current.set(id, Date.now());
  }, []);
  const isEchoOfLocal = useCallback((id: string) => {
    const t = recentLocalMutations.current.get(id);
    if (!t) return false;
    if (Date.now() - t > LOCAL_MUTATION_TTL_MS) {
      recentLocalMutations.current.delete(id);
      return false;
    }
    return true;
  }, []);

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

  // Realtime subscription — surgical patches keyed by row id, scoped to weekStart.
  useEffect(() => {
    if (!weekStart) return;
    const client = supabaseClient();
    const channel = client
      .channel(`shopping_list:${weekStart}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list',
          filter: `week_start=eq.${weekStart}`,
        },
        (payload: RealtimePostgresChangesPayload<ShoppingItem>) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as ShoppingItem;
            if (!row?.id) return;
            if (isEchoOfLocal(row.id)) return;
            if (row.archived) return;
            setItems((prev) => {
              if (prev.some((i) => i.id === row.id)) return prev;
              // Insert preserving `position` ascending order.
              const next = [...prev, row];
              next.sort((a, b) => a.position - b.position);
              return next;
            });
            return;
          }
          if (payload.eventType === 'UPDATE') {
            const row = payload.new as ShoppingItem;
            if (!row?.id) return;
            if (isEchoOfLocal(row.id)) return;
            setItems((prev) => {
              // Row got archived → drop it.
              if (row.archived) return prev.filter((i) => i.id !== row.id);
              const exists = prev.some((i) => i.id === row.id);
              if (!exists) {
                const next = [...prev, row];
                next.sort((a, b) => a.position - b.position);
                return next;
              }
              return prev.map((i) => (i.id === row.id ? row : i));
            });
            return;
          }
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Partial<ShoppingItem>;
            const id = oldRow?.id;
            if (!id) return;
            if (isEchoOfLocal(id)) return;
            setItems((prev) => prev.filter((i) => i.id !== id));
            return;
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [weekStart, isEchoOfLocal]);

  const toggleChecked = useCallback(async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const next = !target.checked;
    markLocal(id);
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
  }, [items, markLocal]);

  const editItem = useCallback(async (id: string, patch: Partial<ShoppingItem>) => {
    markLocal(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    saveState.getState().set('saving');
    const { error } = await supabaseClient()
      .from('shopping_list')
      .update(patch)
      .eq('id', id);
    if (error) { saveState.getState().set('error'); await refresh(); return; }
    saveState.getState().set('saved');
  }, [refresh, markLocal]);

  const deleteItem = useCallback(async (id: string) => {
    const prev = items;
    markLocal(id);
    setItems((p) => p.filter((i) => i.id !== id));
    saveState.getState().set('saving');
    const { error } = await supabaseClient().from('shopping_list').delete().eq('id', id);
    if (error) { saveState.getState().set('error'); setItems(prev); return; }
    saveState.getState().set('saved');
  }, [items, markLocal]);

  const addManual = useCallback(async (input: {
    name: string;
    quantity: number | null;
    unit: string | null;
    aisle: Aisle;
    image_url?: string | null;
    off_barcode?: string | null;
  }) => {
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
        image_url: input.image_url ?? null,
        off_barcode: input.off_barcode ?? null,
      })
      .select('*')
      .single();
    if (error || !data) { saveState.getState().set('error'); return; }
    const row = data as ShoppingItem;
    markLocal(row.id);
    setItems((prev) => (prev.some((i) => i.id === row.id) ? prev : [...prev, row]));
    saveState.getState().set('saved');
  }, [items, weekStart, markLocal]);

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
