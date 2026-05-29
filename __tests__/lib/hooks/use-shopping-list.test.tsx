import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useShoppingList } from '@/lib/hooks/use-shopping-list';

const orderItems = vi.fn();
const eqArch  = vi.fn(() => ({ order: orderItems }));
const eqWeek  = vi.fn(() => ({ eq: eqArch }));
const sel     = vi.fn(() => ({ eq: eqWeek }));
const eqId    = vi.fn(() => Promise.resolve({ error: null }));
const update  = vi.fn(() => ({ eq: eqId }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({
    from: () => ({ select: sel, update }),
  }),
}));

describe('useShoppingList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderItems.mockResolvedValue({
      data: [
        { id: 'i1', week_start: '2026-05-25', name: 'pan', quantity: 1, unit: 'unidad',
          aisle: 'panaderia', source: 'plan', recipe_ids: [], checked: false,
          archived: false, position: 0, created_at: '' },
      ],
      error: null,
    });
  });

  it('loads non-archived items for the week ordered by position', async () => {
    const { result } = renderHook(() => useShoppingList('2026-05-25'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(eqArch).toHaveBeenCalledWith('archived', false);
    expect(orderItems).toHaveBeenCalledWith('position', { ascending: true });
  });

  it('toggleChecked optimistically updates state', async () => {
    const { result } = renderHook(() => useShoppingList('2026-05-25'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.toggleChecked('i1'); });
    expect(result.current.items[0].checked).toBe(true);
    expect(update).toHaveBeenCalledWith({ checked: true });
  });
});
