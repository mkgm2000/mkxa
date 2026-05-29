import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CategorySelect } from '@/components/controls/CategorySelect';

describe('CategorySelect', () => {
  it('renders a native select with 7 options and a visual label', () => {
    render(<CategorySelect value="comida" onChange={() => {}} />);
    const select = screen.getByLabelText('Categoría') as HTMLSelectElement;
    expect(select.options).toHaveLength(7);
    expect(select.value).toBe('comida');
    // 'Comida' appears in the visible label and as the selected option text.
    expect(screen.getAllByText('Comida').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onChange when the user picks another category', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CategorySelect value="comida" onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText('Categoría'), 'salud');
    expect(onChange).toHaveBeenCalledWith('salud');
  });
});
