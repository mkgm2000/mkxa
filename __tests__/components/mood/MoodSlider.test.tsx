import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MoodSlider } from '@/components/mood/MoodSlider';
import { MOOD_ORDER } from '@/lib/moods';

describe('MoodSlider', () => {
  it('exposes a slider role with the current valuenow', () => {
    render(<MoodSlider value="joyful" onChange={() => {}} />);
    const s = screen.getByRole('slider');
    expect(s).toHaveAttribute('aria-valuemin', '0');
    expect(s).toHaveAttribute('aria-valuemax', '9');
    expect(s).toHaveAttribute('aria-valuenow', String(MOOD_ORDER.indexOf('joyful')));
  });

  it('arrow-right moves to the next mood', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MoodSlider value="joyful" onChange={onChange} />);
    const s = screen.getByRole('slider');
    s.focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('happy');
  });

  it('arrow-left at index 0 stays on joyful and does not fire onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MoodSlider value="joyful" onChange={onChange} />);
    const s = screen.getByRole('slider');
    s.focus();
    await user.keyboard('{ArrowLeft}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Home jumps to first mood, End jumps to last', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MoodSlider value="neutral" onChange={onChange} />);
    const s = screen.getByRole('slider');
    s.focus();
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('dizzy');
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('joyful');
  });
});
