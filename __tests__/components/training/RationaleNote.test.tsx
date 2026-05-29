import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { RationaleNote } from '@/components/training/RationaleNote';

describe('RationaleNote', () => {
  it('renders an accessible toggle and the text when open', async () => {
    const user = userEvent.setup();
    render(<RationaleNote text="Excel S4 baseline" variant="day" />);
    const btn = screen.getByRole('button', { name: /justificaci/i });
    await user.click(btn);
    expect(screen.getByText('Excel S4 baseline')).toBeInTheDocument();
  });

  it('uses the weekly label when variant=weekly', () => {
    render(<RationaleNote text="x" variant="weekly" initiallyOpen />);
    expect(screen.getByRole('button', { name: /nota semanal/i })).toBeInTheDocument();
  });
});
