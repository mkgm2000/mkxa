'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { saveState } from '@/lib/save-state';
import type {
  Recipe,
  RecipeImage,
  RecipeIngredient,
  RecipeStep,
  RecipeWithDetails,
} from '@/lib/meals/recipes';

// `recipe` carries every column the API needs to persist — including
// `meal_type` (breakfast/lunch/dinner/snack), which classifies the recipe
// and powers the grouped Recetas view + Solo TikTok quick-create.
interface NewRecipeInput {
  recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'> & { id?: string };
  ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[];
  steps: Omit<RecipeStep, 'id' | 'recipe_id'>[];
  images?: string[];
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseClient()
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { saveState.getState().set('error'); setLoading(false); return; }
    setRecipes((data as Recipe[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Optimistic local update when RecipeCard backfills a missing thumbnail.
  // The card writes to DB and then dispatches this event so we don't have
  // to re-query just to surface the new URL on the next render.
  useEffect(() => {
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent).detail as { id?: string; url?: string };
      if (!detail?.id || !detail?.url) return;
      setRecipes((prev) => prev.map((r) => (r.id === detail.id ? { ...r, thumbnail_url: detail.url! } : r)));
    }
    // recipes:updated has no payload — just trigger a fresh DB read so we
    // pick up arbitrary field changes (title, source_url, meal_type, …).
    function onRecipeUpdated() { void refresh(); }
    window.addEventListener('recipes:thumbnail-updated', onUpdate);
    window.addEventListener('recipes:updated', onRecipeUpdated);
    // Re-fetch when the tab regains focus / becomes visible — picks up
    // any changes the user (or another device) made elsewhere.
    function onFocus() { if (document.visibilityState === 'visible') void refresh(); }
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('recipes:thumbnail-updated', onUpdate);
      window.removeEventListener('recipes:updated', onRecipeUpdated);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return { recipes, loading, refresh };
}

export function useRecipe(id: string | null) {
  const [recipe, setRecipe] = useState<RecipeWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) { setRecipe(null); setLoading(false); return; }
    setLoading(true);
    const supa = supabaseClient();
    const [
      { data: r, error: er },
      { data: i, error: ei },
      { data: s, error: es },
      { data: imgs, error: eimg },
    ] = await Promise.all([
      supa.from('recipes').select('*').eq('id', id).maybeSingle(),
      supa.from('recipe_ingredients').select('*').eq('recipe_id', id).order('position'),
      supa.from('recipe_steps').select('*').eq('recipe_id', id).order('position'),
      supa.from('recipe_images').select('*').eq('recipe_id', id).order('position'),
    ]);
    if (er || ei || es || eimg) { saveState.getState().set('error'); setLoading(false); return; }
    if (!r) { setRecipe(null); setLoading(false); return; }
    setRecipe({
      ...(r as Recipe),
      ingredients: (i as RecipeIngredient[]) ?? [],
      steps: (s as RecipeStep[]) ?? [],
      images: ((imgs as RecipeImage[]) ?? []).map((row) => row.url),
    });
    setLoading(false);
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { recipe, loading, refresh };
}

export async function deleteRecipe(id: string): Promise<{ ok: true } | { error: string }> {
  const supa = supabaseClient();
  saveState.getState().set('saving');
  // Cascade-safe: remove dependents first in case FK is RESTRICT.
  await supa.from('recipe_ingredients').delete().eq('recipe_id', id);
  await supa.from('recipe_steps').delete().eq('recipe_id', id);
  await supa.from('recipe_images').delete().eq('recipe_id', id);
  await supa.from('meal_plan').delete().eq('recipe_id', id);
  const { error } = await supa.from('recipes').delete().eq('id', id);
  if (error) { saveState.getState().set('error'); return { error: error.message }; }
  saveState.getState().set('saved');
  return { ok: true };
}

export async function saveRecipe(input: NewRecipeInput): Promise<{ id: string } | { error: string }> {
  const supa = supabaseClient();
  saveState.getState().set('saving');

  const { data: created, error: e1 } = await supa
    .from('recipes')
    .insert([input.recipe])
    .select('id')
    .single();
  if (e1 || !created) {
    saveState.getState().set('error');
    return { error: e1?.message ?? 'No se pudo crear la receta' };
  }
  const recipeId = (created as { id: string }).id;

  if (input.ingredients.length > 0) {
    const rows = input.ingredients.map((ing, idx) => ({
      ...ing,
      recipe_id: recipeId,
      position: ing.position ?? idx,
    }));
    const { error: e2 } = await supa.from('recipe_ingredients').insert(rows);
    if (e2) { saveState.getState().set('error'); return { error: e2.message }; }
  }

  if (input.steps.length > 0) {
    const rows = input.steps.map((st, idx) => ({
      ...st,
      recipe_id: recipeId,
      position: st.position ?? idx + 1,
    }));
    const { error: e3 } = await supa.from('recipe_steps').insert(rows);
    if (e3) { saveState.getState().set('error'); return { error: e3.message }; }
  }

  if (input.images && input.images.length > 0) {
    const rows = input.images.map((url, idx) => ({
      recipe_id: recipeId,
      url,
      position: idx,
    }));
    const { error: e4 } = await supa.from('recipe_images').insert(rows);
    if (e4) { saveState.getState().set('error'); return { error: e4.message }; }
  }

  saveState.getState().set('saved');
  return { id: recipeId };
}

export async function updateRecipe(
  id: string,
  patch: Partial<{
    title: string;
    source_url: string | null;
    source_type: 'tiktok' | 'instagram' | 'manual' | 'web' | 'other' | null;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | null;
    notes: string | null;
    thumbnail_url: string | null;
    tags: string[];
  }>,
): Promise<{ ok: true } | { error: string }> {
  const supa = supabaseClient();
  saveState.getState().set('saving');
  const { error } = await supa
    .from('recipes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { saveState.getState().set('error'); return { error: error.message }; }
  saveState.getState().set('saved');
  // Tell the list to refresh in-place so the card reflects the change.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('recipes:updated', { detail: { id } }));
  }
  return { ok: true };
}

// Replaces the full ingredient list for a recipe. Strategy is dumb but
// safe: delete every row for `recipeId`, then re-insert the new set.
// We don't try to diff because the edit sheet is the only writer here
// and the lists are tiny — a clean swap is easier to reason about than
// chasing per-row updates. Returns the first error we see, if any.
export async function updateRecipeIngredients(
  recipeId: string,
  ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[],
): Promise<{ ok: true } | { error: string }> {
  const supa = supabaseClient();
  saveState.getState().set('saving');
  const { error: eDel } = await supa
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', recipeId);
  if (eDel) { saveState.getState().set('error'); return { error: eDel.message }; }
  if (ingredients.length > 0) {
    const rows = ingredients.map((ing, idx) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      aisle: ing.aisle ?? 'otros',
      optional: ing.optional ?? false,
      recipe_id: recipeId,
      position: ing.position ?? idx,
    }));
    const { error: eIns } = await supa.from('recipe_ingredients').insert(rows);
    if (eIns) { saveState.getState().set('error'); return { error: eIns.message }; }
  }
  saveState.getState().set('saved');
  return { ok: true };
}

// Lazy backfill helper used by the TikTok card: when an older recipe
// has no thumbnail_url yet, the card calls this with the URL it just
// resolved from oEmbed. Best-effort — failure is silent (the next
// render will retry).
export async function setRecipeThumbnail(
  id: string,
  url: string,
): Promise<{ ok: true } | { error: string }> {
  const supa = supabaseClient();
  const { error } = await supa
    .from('recipes')
    .update({ thumbnail_url: url, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateRecipePrimaryImage(
  recipeId: string,
  url: string | null,
): Promise<{ ok: true } | { error: string }> {
  const supa = supabaseClient();
  saveState.getState().set('saving');
  const { error } = await supa
    .from('recipes')
    .update({ image_url: url, updated_at: new Date().toISOString() })
    .eq('id', recipeId);
  if (error) { saveState.getState().set('error'); return { error: error.message }; }
  saveState.getState().set('saved');
  return { ok: true };
}

export async function addRecipeImage(
  recipeId: string,
  url: string,
): Promise<{ ok: true } | { error: string }> {
  const supa = supabaseClient();
  saveState.getState().set('saving');
  const { data: last, error: eMax } = await supa
    .from('recipe_images')
    .select('position')
    .eq('recipe_id', recipeId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (eMax) { saveState.getState().set('error'); return { error: eMax.message }; }
  const nextPos = (last as { position: number } | null)?.position ?? -1;
  const { error } = await supa.from('recipe_images').insert([
    { recipe_id: recipeId, url, position: nextPos + 1 },
  ]);
  if (error) { saveState.getState().set('error'); return { error: error.message }; }
  saveState.getState().set('saved');
  return { ok: true };
}

export async function removeRecipeImage(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const supa = supabaseClient();
  saveState.getState().set('saving');
  const { error } = await supa.from('recipe_images').delete().eq('id', id);
  if (error) { saveState.getState().set('error'); return { error: error.message }; }
  saveState.getState().set('saved');
  return { ok: true };
}

// Convenience: remove by URL (since the detail view only carries URLs).
export async function removeRecipeImageByUrl(
  recipeId: string,
  url: string,
): Promise<{ ok: true } | { error: string }> {
  const supa = supabaseClient();
  saveState.getState().set('saving');
  const { error } = await supa
    .from('recipe_images')
    .delete()
    .eq('recipe_id', recipeId)
    .eq('url', url);
  if (error) { saveState.getState().set('error'); return { error: error.message }; }
  saveState.getState().set('saved');
  return { ok: true };
}
