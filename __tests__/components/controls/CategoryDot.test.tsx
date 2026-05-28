import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CategoryDot } from '@/components/controls/CategoryDot';

describe('CategoryDot', () => {
  it('renders an 8x8 circle with bg-cat-{category}', () => {
    const { container } = render(<CategoryDot category="comida" />);
    const span = container.querySelector('span')!;
    expect(span).toBeTruthy();
    expect(span.className).toContain('bg-cat-comida');
    expect(span.className).toContain('h-2');
    expect(span.className).toContain('w-2');
    expect(span.className).toContain('rounded-full');
  });

  it('uses the right class for each category', () => {
    const { container } = render(<CategoryDot category="salud" />);
    expect(container.querySelector('span')!.className).toContain('bg-cat-salud');
  });
});
