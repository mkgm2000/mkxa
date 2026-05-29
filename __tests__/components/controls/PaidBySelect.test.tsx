import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PaidBySelect } from '@/components/controls/PaidBySelect';

describe('PaidBySelect', () => {
  it('renders 3 radio options and marks the active one', () => {
    render(<PaidBySelect value="MK" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'MK' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Xabi' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Compartido' })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange when another option is tapped', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PaidBySelect value="MK" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Compartido' }));
    expect(onChange).toHaveBeenCalledWith('Compartido');
  });
});
