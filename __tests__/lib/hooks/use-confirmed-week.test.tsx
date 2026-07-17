import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConfirmedWeek } from '@/lib/hooks/use-confirmed-week';

// The hook queries: .select().eq().eq().eq().order().order().limit(1),
// resolving to { data: rows[], error }. `limit` is the terminal resolver.
const limit = vi.fn();
const order2 = vi.fn(() => ({ limit }));
const order1 = vi.fn(() => ({ order: order2 }));
const eq3 = vi.fn(() => ({ order: order1 }));
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
    limit.mockResolvedValueOnce({ data: [], error: null });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('l:false d:0')).toBeInTheDocument());
  });
  it('returns the plan when present', async () => {
    limit.mockResolvedValueOnce({
      data: [{ plan_jsonb: { athlete: 'MK', week: 4, weekly_note: 'x', days: [
        { key: 'D1', title: 't', rpe: 'r', blocks: [{ name: 'n', sets: 's', load: 'l' }], rationale: 'r' },
        { key: 'D2', title: 't', rpe: 'r', blocks: [{ name: 'n', sets: 's', load: 'l' }], rationale: 'r' },
        { key: 'D3', title: 't', rpe: 'r', blocks: [{ name: 'n', sets: 's', load: 'l' }], rationale: 'r' },
      ] } }],
      error: null,
    });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('l:false d:3')).toBeInTheDocument());
  });
});
