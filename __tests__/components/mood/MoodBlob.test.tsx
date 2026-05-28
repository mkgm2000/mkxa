import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MoodBlob } from '@/components/mood/MoodBlob';
import { MOODS } from '@/lib/moods';

describe('MoodBlob', () => {
  it('renders an SVG with role=img and accessible name per mood', () => {
    for (const m of MOODS) {
      const { container, unmount } = render(<MoodBlob mood={m} size={120} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg!.getAttribute('role')).toBe('img');
      expect(svg!.getAttribute('aria-label')).toMatch(/.+/);
      unmount();
    }
  });

  it('namespaces gradient ids per instance to avoid collisions', () => {
    const { container } = render(
      <>
        <MoodBlob mood="happy" size={80} />
        <MoodBlob mood="happy" size={80} />
      </>
    );
    const ids = Array.from(
      container.querySelectorAll('linearGradient, radialGradient')
    ).map((g) => g.getAttribute('id'));
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
