import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import type { Expense } from '@/lib/expenses';

const SAMPLE: Expense = {
  id: '1',
  amount: 12.5,
  currency: 'EUR',
  category: 'comida',
  date: '2026-05-20',
  paid_by: 'MK',
  description: null,
  merchant: 'Mercadona',
  receipt_url: null,
  receipt_data: null,
  created_by: 'MK',
  created_at: '2026-05-20T10:00:00Z',
  updated_at: '2026-05-20T10:00:00Z',
};

describe('ExpenseCard', () => {
  it('renders merchant, formatted amount, category label and paid_by', () => {
    render(<ExpenseCard expense={SAMPLE} />);
    expect(screen.getByText('Mercadona')).toBeInTheDocument();
    expect(screen.getByText(/12,50/)).toBeInTheDocument();
    expect(screen.getByText(/Comida/)).toBeInTheDocument();
    expect(screen.getByText(/MK/)).toBeInTheDocument();
  });

  it('links to the detail route', () => {
    render(<ExpenseCard expense={SAMPLE} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/expenses/1');
  });

  it('renders a category color bar', () => {
    const { container } = render(<ExpenseCard expense={SAMPLE} />);
    expect(container.querySelector('.bg-cat-comida')).toBeTruthy();
  });
});
