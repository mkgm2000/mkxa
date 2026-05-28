import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AddExpenseSheet } from '@/components/expenses/AddExpenseSheet';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('AddExpenseSheet', () => {
  it('renders nothing when closed', () => {
    render(<AddExpenseSheet open={false} onClose={() => {}} />);
    expect(screen.queryByText('Escanear factura')).not.toBeInTheDocument();
  });

  it('renders both options when open', () => {
    render(<AddExpenseSheet open onClose={() => {}} />);
    expect(screen.getByText('Escanear factura')).toBeInTheDocument();
    expect(screen.getByText('Añadir manual')).toBeInTheDocument();
  });

  it('navigates and closes on option click', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AddExpenseSheet open onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /Escanear factura/ }));
    expect(push).toHaveBeenCalledWith('/expenses/scan');
    expect(onClose).toHaveBeenCalled();
  });
});
