'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { MediaItem } from '@/lib/media/types';

export function useMedia() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseClient()
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[useMedia] fetch failed', error);
      setItems([]);
    } else {
      setItems((data ?? []) as MediaItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    function onFocus() { if (document.visibilityState === 'visible') void refresh(); }
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  // Insert. Uses upsert on (tmdb_id, media_type) so re-adding an item
  // from search just refreshes added_by/status rather than failing.
  const create = useCallback(async (payload: Partial<MediaItem> & {
    tmdb_id: number; media_type: 'movie' | 'tv'; title: string;
  }) => {
    const { data, error } = await supabaseClient()
      .from('media_items')
      .upsert(payload, { onConflict: 'tmdb_id,media_type' })
      .select('*')
      .single();
    if (error) throw error;
    setItems((prev) => {
      const next = prev.filter((m) => m.id !== (data as MediaItem).id);
      return [data as MediaItem, ...next];
    });
    return data as MediaItem;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<MediaItem>) => {
    const { data, error } = await supabaseClient()
      .from('media_items')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    setItems((prev) => prev.map((m) => (m.id === id ? (data as MediaItem) : m)));
    return data as MediaItem;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabaseClient().from('media_items').delete().eq('id', id);
    if (error) throw error;
    setItems((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { items, loading, refresh, create, update, remove };
}
