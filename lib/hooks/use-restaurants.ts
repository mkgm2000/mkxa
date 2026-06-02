'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { Restaurant } from '@/lib/meals/restaurants';

export function useRestaurants() {
  const [items, setItems] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseClient()
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[useRestaurants] fetch failed', error);
      setItems([]);
    } else {
      setItems((data ?? []) as Restaurant[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Refresh when returning to the tab (matches the recipes pattern so a
  // restaurant added in another window shows up).
  useEffect(() => {
    function onFocus() { if (document.visibilityState === 'visible') void refresh(); }
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const create = useCallback(async (payload: Partial<Restaurant> & { name: string }) => {
    const { data, error } = await supabaseClient()
      .from('restaurants')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    setItems((prev) => [data as Restaurant, ...prev]);
    return data as Restaurant;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Restaurant>) => {
    const { data, error } = await supabaseClient()
      .from('restaurants')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    setItems((prev) => prev.map((r) => (r.id === id ? (data as Restaurant) : r)));
    return data as Restaurant;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabaseClient().from('restaurants').delete().eq('id', id);
    if (error) throw error;
    setItems((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { items, loading, refresh, create, update, remove };
}
