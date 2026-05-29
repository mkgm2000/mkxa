import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConfirmedWeek } from '@/lib/hooks/use-confirmed-week';

const maybeSingle = vi.fn();
const eq3 = vi.fn(() => ({ maybeSingle }));
const eq2 = vi.fn(() => ({ eq: eq3 }));
const eq1 = vi.fn(() => ({ eq: eq2 }));
const select = vi.fn(() => ({ eq: eq1 }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({ from: () => ({ select }) }),
}));

function Probe() {
  const { plan, loading } = useConfirmedWeek('MK', 4);
  return <p>l:{String(loading)} d:{plan?.days?.length ?? 0}</p>;
}

describe('useConfirmedWeek', () => {
  beforeEach(() => vi.clearAllMocks());
  it('returns null when no confirmed row exists', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('l:false d:0')).toBeInTheDocument());
  });
  it('returns the plan when present', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { plan_jsonb: { athlete: 'MK', week: 4, weekly_note: 'x', days: [
        { key: 'D1', title: 't', rpe: 'r', blocks: [{ name: 'n', sets: 's', load: 'l' }], rationale: 'r' },
        { key: 'D2', title: 't', rpe: 'r', blocks: [{ name: 'n', sets: 's', load: 'l' }], rationale: 'r' },
        { key: 'D3', title: 't', rpe: 'r', blocks: [{ name: 'n', sets: 's', load: 'l' }], rationale: 'r' },
      ] } },
      error: null,
    });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('l:false d:3')).toBeInTheDocument());
  });
});
