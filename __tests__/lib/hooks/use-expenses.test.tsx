import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExpenses } from '@/lib/hooks/use-expenses';

const order = vi.fn();
const lte = vi.fn(() => ({ order }));
const gte = vi.fn(() => ({ lte }));
const select = vi.fn(() => ({ gte }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({
    from: () => ({ select }),
  }),
}));

const SAMPLE = [
  { id: '1', amount: 12.5, currency: 'EUR', category: 'comida',
    date: '2026-05-20', paid_by: 'MK', description: null, merchant: 'Mercadona',
    receipt_url: null, receipt_data: null, created_by: 'MK',
    created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-20T10:00:00Z' },
  { id: '2', amount: 7.5, currency: 'EUR', category: 'transporte',
    date: '2026-05-21', paid_by: 'Xabi', description: null, merchant: 'EMT',
    receipt_url: null, receipt_data: null, created_by: 'Xabi',
    created_at: '2026-05-21T10:00:00Z', updated_at: '2026-05-21T10:00:00Z' },
  { id: '3', amount: 20, currency: 'EUR', category: 'comida',
    date: '2026-05-22', paid_by: 'Compartido', description: null, merchant: 'Carrefour',
    receipt_url: null, receipt_data: null, created_by: 'MK',
    created_at: '2026-05-22T10:00:00Z', updated_at: '2026-05-22T10:00:00Z' },
];

function Probe({ from = '2026-05-01', to = '2026-05-31' }: { from?: string; to?: string }) {
  const { data, loading, total, totalByCategory } = useExpenses({ from, to });
  return (
    <>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="count">{data.length}</p>
      <p data-testid="total">{total}</p>
      <p data-testid="comida">{totalByCategory.comida ?? 0}</p>
      <p data-testid="transporte">{totalByCategory.transporte ?? 0}</p>
    </>
  );
}

describe('useExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    order.mockResolvedValue({ data: SAMPLE, error: null });
  });

  it('queries supabase with the date range and orders by date desc', async () => {
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(gte).toHaveBeenCalledWith('date', '2026-05-01');
    expect(lte).toHaveBeenCalledWith('date', '2026-05-31');
    expect(order).toHaveBeenCalledWith('date', { ascending: false });
    expect(screen.getByTestId('count')).toHaveTextContent('3');
  });

  it('returns total and per-category totals', async () => {
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('total')).toHaveTextContent('40');
    expect(screen.getByTestId('comida')).toHaveTextContent('32.5');
    expect(screen.getByTestId('transporte')).toHaveTextContent('7.5');
  });
});
