import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MoodCheckIn } from '@/components/mood/MoodCheckIn';

describe('MoodCheckIn', () => {
  it('renders the question header and a 10-token picker', () => {
    render(<MoodCheckIn onConfirm={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Cómo estás/i);
    expect(screen.getAllByRole('radio')).toHaveLength(10);
  });

  it('changing selection updates the hero label', async () => {
    const user = userEvent.setup();
    render(<MoodCheckIn onConfirm={() => {}} />);
    await user.click(screen.getByRole('radio', { name: 'Triste' }));
    expect(screen.getByTestId('mood-checkin-label')).toHaveTextContent('Triste');
  });

  it('calls onConfirm with the selected mood', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<MoodCheckIn onConfirm={onConfirm} />);
    await user.click(screen.getByRole('radio', { name: 'Pleno' }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledWith('joyful');
  });
});
