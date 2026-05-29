import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCreateExpense } from '@/lib/hooks/use-create-expense';
import { saveState } from '@/lib/save-state';

const single = vi.fn();
const selectFn = vi.fn(() => ({ single }));
const insert = vi.fn(() => ({ select: selectFn }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({ from: () => ({ insert }) }),
}));

function Probe() {
  const { create, saving } = useCreateExpense();
  return (
    <>
      <p data-testid="saving">{String(saving)}</p>
      <button onClick={() => create({
        amount: 12.5,
        currency: 'EUR',
        category: 'comida',
        date: '2026-05-21',
        paid_by: 'MK',
        description: null,
        merchant: 'Mercadona',
        receipt_url: null,
        receipt_data: null,
        created_by: 'MK',
      })}>create</button>
    </>
  );
}

describe('useCreateExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveState.getState().set('idle');
    single.mockResolvedValue({
      data: { id: 'abc' }, error: null,
    });
  });

  it('insert is called and writes save-state transitions', async () => {
    render(<Probe />);
    await act(async () => {
      screen.getByText('create').click();
    });
    expect(insert).toHaveBeenCalled();
    expect(saveState.getState().status).toBe('saved');
  });

  it('flags error on insert failure', async () => {
    single.mockResolvedValueOnce({ data: null, error: new Error('nope') });
    render(<Probe />);
    await act(async () => {
      screen.getByText('create').click();
    });
    expect(saveState.getState().status).toBe('error');
  });
});
