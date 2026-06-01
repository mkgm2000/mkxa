import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRecipes, saveRecipe } from '@/lib/hooks/use-recipes';

const order = vi.fn();
const selectRecipes = vi.fn(() => ({ order }));
const insertSelectSingle = vi.fn();
const insertSelect = vi.fn(() => ({ single: insertSelectSingle }));
const insertRecipe = vi.fn(() => ({ select: insertSelect }));
const insertIng = vi.fn(() => Promise.resolve({ error: null }));
const insertSteps = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({
    from: (table: string) => {
      if (table === 'recipes') return { select: selectRecipes, insert: insertRecipe };
      if (table === 'recipe_ingredients') return { insert: insertIng };
      if (table === 'recipe_steps') return { insert: insertSteps };
      return {};
    },
  }),
}));

describe('useRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    order.mockResolvedValue({ data: [{ id: 'r1', title: 'A' }], error: null });
  });

  it('loads recipes ordered by created_at desc', async () => {
    const { result } = renderHook(() => useRecipes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recipes).toHaveLength(1);
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

describe('saveRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertSelectSingle.mockResolvedValue({ data: { id: 'r-new' }, error: null });
  });

  it('inserts recipe, then ingredients, then steps sequentially', async () => {
    const out = await saveRecipe({
      recipe: {
        title: 'T', source_url: null, source_type: 'manual', image_url: null,
        prep_minutes: 10, servings: 2, tags: [], notes: null, created_by: 'MK',
        meal_type: null,
      },
      ingredients: [{ name: 'sal', quantity: 1, unit: 'pizca', aisle: 'despensa', position: 0 }],
      steps: [{ position: 1, body: 'Mezclar', timer_min: null }],
    });
    expect(out).toEqual({ id: 'r-new' });
    expect(insertRecipe).toHaveBeenCalled();
    expect(insertIng).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'sal', recipe_id: 'r-new' }),
    ]);
    expect(insertSteps).toHaveBeenCalledWith([
      expect.objectContaining({ body: 'Mezclar', recipe_id: 'r-new' }),
    ]);
  });
});
