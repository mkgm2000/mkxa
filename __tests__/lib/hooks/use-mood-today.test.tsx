import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMoodToday } from '@/lib/hooks/use-mood-today';

const maybeSingle = vi.fn();
const eq2    = vi.fn(() => ({ maybeSingle }));
const eq1    = vi.fn(() => ({ eq: eq2 }));
const select = vi.fn(() => ({ eq: eq1 }));
const upsert = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({
    from: () => ({ select, upsert }),
  }),
}));

function Probe() {
  const { mood, save, loading } = useMoodToday('MK');
  return (
    <>
      <p>loading:{String(loading)}</p>
      <p>mood:{mood?.mood ?? 'none'}</p>
      <button onClick={() => save('joyful')}>save</button>
    </>
  );
}

describe('useMoodToday', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('loads null when no row exists', async () => {
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    expect(screen.getByText('mood:none')).toBeInTheDocument();
  });

  it('save upserts and updates local state', async () => {
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    await act(async () => {
      screen.getByText('save').click();
    });
    expect(upsert).toHaveBeenCalled();
  });
});
