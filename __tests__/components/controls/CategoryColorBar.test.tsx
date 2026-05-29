import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CategoryColorBar } from '@/components/controls/CategoryColorBar';

describe('CategoryColorBar', () => {
  it('renders 4px vertical bar absolutely positioned with cat color', () => {
    const { container } = render(<CategoryColorBar category="comida" />);
    const span = container.querySelector('span')!;
    expect(span.className).toContain('absolute');
    expect(span.className).toContain('left-0');
    expect(span.className).toContain('top-0');
    expect(span.className).toContain('bottom-0');
    expect(span.className).toContain('w-1');
    expect(span.className).toContain('bg-cat-comida');
  });
});
