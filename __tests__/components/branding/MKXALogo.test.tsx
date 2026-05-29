import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MKXALogo } from '@/components/branding/MKXALogo';

describe('MKXALogo', () => {
  it('renders an accessible MKXA wordmark', () => {
    render(<MKXALogo />);
    const svg = screen.getByRole('img', { name: 'MKXA' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });

  it('uses the legacy teal for M/K and lime for X/A fills', () => {
    const { container } = render(<MKXALogo />);
    const texts = container.querySelectorAll('text');
    const fills = Array.from(texts).map((t) => t.getAttribute('fill'));
    expect(fills).toEqual(['#00C49A', '#00C49A', '#7CB518', '#7CB518']);
  });
});
