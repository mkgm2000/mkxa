import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MoodCheckIn } from '@/components/mood/MoodCheckIn';

describe('MoodCheckIn', () => {
  it('renders the question, a slider and the confirm button', () => {
    render(<MoodCheckIn onConfirm={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Cómo estás/i);
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
  });

  it('confirms with the keyboard-selected mood', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<MoodCheckIn onConfirm={onConfirm} />);
    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowRight}');
    await user.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalled();
    const called = onConfirm.mock.calls[0]?.[0];
    expect(['happy', 'love']).toContain(called);
  });
});
