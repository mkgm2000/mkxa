import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';

vi.mock('@/lib/athlete-context', () => ({
  useAthlete: () => 'MK',
}));

const create = vi.fn(async (v: unknown) => ({ id: 'new', ...(v as object) }));
vi.mock('@/lib/hooks/use-create-expense', () => ({
  useCreateExpense: () => ({ create, saving: false }),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('ExpenseForm', () => {
  it('renders core inputs', () => {
    render(<ExpenseForm />);
    expect(screen.getByLabelText(/Importe/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Comercio/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Categoría/)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Pagado por' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nota/)).toBeInTheDocument();
  });

  it('calls create on submit', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm />);
    await user.clear(screen.getByLabelText(/Importe/));
    await user.type(screen.getByLabelText(/Importe/), '12.50');
    await user.type(screen.getByLabelText(/Comercio/), 'Mercadona');
    await user.click(screen.getByRole('button', { name: /Guardar/ }));
    expect(create).toHaveBeenCalled();
    const arg = create.mock.calls.at(-1)?.[0] as { amount: number; merchant: string; created_by: string };
    expect(arg.amount).toBe(12.5);
    expect(arg.merchant).toBe('Mercadona');
    expect(arg.created_by).toBe('MK');
  });
});
