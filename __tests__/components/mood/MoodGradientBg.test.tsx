import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MoodGradientBg } from '@/components/mood/MoodGradientBg';

describe('MoodGradientBg', () => {
  it('applies a 170deg linear-gradient styled to the mood', () => {
    render(
      <MoodGradientBg mood="happy" data-testid="bg">
        <span>child</span>
      </MoodGradientBg>
    );
    const el = screen.getByTestId('bg');
    expect(el.style.backgroundImage).toContain('linear-gradient(170deg');
    expect(el.textContent).toBe('child');
  });
});
