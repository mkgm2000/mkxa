'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import type { RecipeCollection } from '@/lib/meals/collections';

// List view: hides the heavy `items` jsonb so the recipes tab doesn't pull
// thousands of rows of payload over the wire for the index card. The detail
// page fetches the full row separately via useCollection.
export function useCollections() {
  const [collections, setCollections] = useState<Omit<RecipeCollection, 'items'>[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseClient()
      .from('recipe_collections')
      .select('id,title,source_url,source_type,item_count,cover_url,created_by,created_at,updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[useCollections] fetch failed', error);
      setCollections([]);
    } else {
      setCollections((data ?? []) as Omit<RecipeCollection, 'items'>[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Same focus/visibility refresh pattern other meals hooks use.
  useEffect(() => {
    function onFocus() { if (document.visibilityState === 'visible') void refresh(); }
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabaseClient().from('recipe_collections').delete().eq('id', id);
    if (error) throw error;
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { collections, loading, refresh, remove };
}

export function useCollection(id: string | null) {
  const [collection, setCollection] = useState<RecipeCollection | null>(null);
  const [promotedItems, setPromotedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) { setCollection(null); setLoading(false); return; }
    setLoading(true);
    const supa = supabaseClient();
    const [{ data: row }, { data: recipeRows }] = await Promise.all([
      supa.from('recipe_collections').select('*').eq('id', id).maybeSingle(),
      supa.from('recipes')
        .select('source_collection_item')
        .eq('source_collection_id', id),
    ]);
    setCollection((row as RecipeCollection | null) ?? null);
    const promoted = new Set<string>();
    for (const r of (recipeRows ?? []) as { source_collection_item: string | null }[]) {
      if (r.source_collection_item) promoted.add(r.source_collection_item);
    }
    setPromotedItems(promoted);
    setLoading(false);
  }, [id]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { collection, promotedItems, loading, refresh };
}
