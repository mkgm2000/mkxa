import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Bell } from 'lucide-react';
import { describe, it, expect, vi } from 'vitest';
import { HeaderActionButton } from '@/components/nav/HeaderActionButton';

describe('HeaderActionButton', () => {
  it('renders an accessible button with the given icon and label', () => {
    render(<HeaderActionButton icon={Bell} label="Notificaciones" />);
    const btn = screen.getByRole('button', { name: 'Notificaciones' });
    expect(btn.querySelector('svg')).not.toBeNull();
  });

  it('shows a dot when dot=true', () => {
    render(<HeaderActionButton icon={Bell} label="Notificaciones" dot />);
    expect(screen.getByTestId('header-action-dot')).toBeInTheDocument();
  });

  it('calls onClick', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<HeaderActionButton icon={Bell} label="x" onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
