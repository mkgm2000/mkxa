import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SegmentedDayWeekMonth } from '@/components/controls/SegmentedDayWeekMonth';

describe('SegmentedDayWeekMonth', () => {
  it('renders 3 options and marks the active one', () => {
    render(<SegmentedDayWeekMonth value="week" onChange={() => {}} />);
    const week = screen.getByRole('radio', { name: 'Semana' });
    expect(week).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange when a different option is tapped', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SegmentedDayWeekMonth value="week" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Día' }));
    expect(onChange).toHaveBeenCalledWith('day');
  });
});
