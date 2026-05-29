import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAthleteProfile } from '@/lib/hooks/use-athlete-profile';

const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({ from: () => ({ select }) }),
}));

function Probe() {
  const { profile, loading } = useAthleteProfile('MK');
  return (
    <>
      <p>loading:{String(loading)}</p>
      <p>url:{profile?.avatar_url ?? 'none'}</p>
    </>
  );
}

describe('useAthleteProfile', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns the row when present', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { athlete: 'MK', avatar_url: 'https://x/y.jpg' }, error: null });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    expect(screen.getByText('url:https://x/y.jpg')).toBeInTheDocument();
  });

  it('returns null avatar when row missing', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    expect(screen.getByText('url:none')).toBeInTheDocument();
  });
});
