import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWeekStreak } from '@/lib/hooks/use-week-streak';

const eq = vi.fn();
const select = vi.fn(() => ({ eq }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({ from: () => ({ select }) }),
}));
vi.mock('@/lib/plan-hyrox', () => ({
  getCurrentWeek: () => 3,
}));

function Probe() {
  const { streak, loading } = useWeekStreak('MK');
  return (
    <>
      <p>loading:{String(loading)}</p>
      <p>streak:{streak}</p>
    </>
  );
}

describe('useWeekStreak', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns the consecutive-weeks count', async () => {
    eq.mockResolvedValueOnce({
      data: [
        { week: 3, day_key: 'D1', completed: true },
        { week: 2, day_key: 'D2', completed: true },
      ],
      error: null,
    });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    expect(screen.getByText('streak:2')).toBeInTheDocument();
  });

  it('returns 0 on error', async () => {
    eq.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    expect(screen.getByText('streak:0')).toBeInTheDocument();
  });
});
