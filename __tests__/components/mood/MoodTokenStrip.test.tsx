import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MoodTokenStrip } from '@/components/mood/MoodTokenStrip';

describe('MoodTokenStrip', () => {
  it('renders 10 mood tokens', () => {
    render(<MoodTokenStrip value="happy" onChange={() => {}} />);
    expect(screen.getAllByRole('radio')).toHaveLength(10);
  });

  it('reports the selected mood', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MoodTokenStrip value="happy" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: /Triste/ }));
    expect(onChange).toHaveBeenCalledWith('sad');
  });
});
