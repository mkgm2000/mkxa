'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export interface ActivityEvent {
  id: string;
  kind: 'mood' | 'recipe' | 'restaurant' | 'collection' | 'training';
  athlete: 'MK' | 'Xabi' | null;
  /** Pre-rendered Spanish title for the notification list. */
  text: string;
  /** ISO timestamp used for sorting + the "hace X" label. */
  at: string;
  /** Optional deep-link the bell row can open. */
  href?: string;
}

const STORAGE_KEY = 'mkxa:notifications:lastSeenISO';

// Reads the timestamp the user last opened the bell. Browser-only —
// safe to call from effects.
function getLastSeen(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY) ?? '';
}

export function markNotificationsSeen() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
}

// Pulls recent activity from the tables that already track it (mood_logs,
// recipes, restaurants, recipe_collections, training_weeks). No dedicated
// notifications table — we just sort the union by timestamp client-side.
// Cheap enough for ~30 items / table and keeps the schema simple.
export function useActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    const supa = supabaseClient();
    const [moods, recipes, restaurants, collections, weeks] = await Promise.all([
      supa.from('mood_logs').select('id,athlete,mood,date,updated_at').order('updated_at', { ascending: false }).limit(10),
      supa.from('recipes').select('id,title,created_by,created_at').order('created_at', { ascending: false }).limit(10),
      supa.from('restaurants').select('id,name,added_by,status,created_at').order('created_at', { ascending: false }).limit(10),
      supa.from('recipe_collections').select('id,title,created_by,item_count,created_at').order('created_at', { ascending: false }).limit(5),
      supa.from('training_weeks').select('athlete,week,version,status,confirmed_at').eq('status', 'confirmed').order('confirmed_at', { ascending: false }).limit(5),
    ]);

    const out: ActivityEvent[] = [];

    for (const m of (moods.data ?? []) as { id: string; athlete: 'MK' | 'Xabi'; mood: string; date: string; updated_at: string }[]) {
      out.push({
        id: `mood:${m.id}`,
        kind: 'mood',
        athlete: m.athlete,
        text: `${m.athlete} registró su mood`,
        at: m.updated_at,
        href: '/mood',
      });
    }
    for (const r of (recipes.data ?? []) as { id: string; title: string; created_by: 'MK' | 'Xabi' | null; created_at: string }[]) {
      out.push({
        id: `recipe:${r.id}`,
        kind: 'recipe',
        athlete: r.created_by,
        text: `${r.created_by ?? 'Alguien'} añadió receta "${r.title}"`,
        at: r.created_at,
        href: '/meals?tab=recetas',
      });
    }
    for (const r of (restaurants.data ?? []) as { id: string; name: string; added_by: 'MK' | 'Xabi' | null; status: string; created_at: string }[]) {
      const verb = r.status === 'visited' ? 'visitó' : 'guardó';
      out.push({
        id: `rest:${r.id}`,
        kind: 'restaurant',
        athlete: r.added_by,
        text: `${r.added_by ?? 'Alguien'} ${verb} "${r.name}"`,
        at: r.created_at,
        href: '/meals/restaurants',
      });
    }
    for (const c of (collections.data ?? []) as { id: string; title: string; created_by: 'MK' | 'Xabi' | null; item_count: number; created_at: string }[]) {
      out.push({
        id: `col:${c.id}`,
        kind: 'collection',
        athlete: c.created_by,
        text: `${c.created_by ?? 'Alguien'} importó colección "${c.title}" (${c.item_count} vídeos)`,
        at: c.created_at,
        href: `/meals/collections/${c.id}`,
      });
    }
    for (const w of (weeks.data ?? []) as { athlete: 'MK' | 'Xabi'; week: number; version: number; confirmed_at: string | null }[]) {
      if (!w.confirmed_at) continue;
      out.push({
        id: `week:${w.athlete}:${w.week}:${w.version}`,
        kind: 'training',
        athlete: w.athlete,
        text: `Plan S${w.week} confirmado para ${w.athlete}`,
        at: w.confirmed_at,
        href: `/training?week=${w.week}`,
      });
    }

    out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    const last = getLastSeen();
    const unreadCount = last ? out.filter((e) => e.at > last).length : out.length;
    setEvents(out.slice(0, 30));
    setUnread(unreadCount);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Refresh when tab regains focus so the bell stays warm.
  useEffect(() => {
    function onFocus() { if (document.visibilityState === 'visible') void refresh(); }
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return { events, loading, unread, refresh };
}
