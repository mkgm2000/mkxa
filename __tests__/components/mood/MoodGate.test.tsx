import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoodGate } from '@/components/mood/MoodGate';

const useMoodTodayMock = vi.fn();
vi.mock('@/lib/hooks/use-mood-today', () => ({
  useMoodToday: (a: unknown) => useMoodTodayMock(a),
}));

vi.mock('@/lib/athlete-context', () => ({
  useAthlete: () => 'MK',
}));

describe('MoodGate', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows nothing while loading', () => {
    useMoodTodayMock.mockReturnValue({ mood: null, loading: true, save: vi.fn() });
    render(<MoodGate><p>child</p></MoodGate>);
    expect(screen.queryByText('child')).toBeNull();
  });

  it('shows MoodCheckIn when no mood today', () => {
    useMoodTodayMock.mockReturnValue({ mood: null, loading: false, save: vi.fn() });
    render(<MoodGate><p>child</p></MoodGate>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Cómo estás/);
    expect(screen.queryByText('child')).toBeNull();
  });

  it('renders children when mood exists', () => {
    useMoodTodayMock.mockReturnValue({
      mood: { athlete: 'MK', date: '2026-05-28', mood: 'joyful', note: null },
      loading: false,
      save: vi.fn(),
    });
    render(<MoodGate><p>child</p></MoodGate>);
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});
