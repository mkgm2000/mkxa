import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTraining } from '@/lib/hooks/use-training';

const eq2 = vi.fn();
const eq1 = vi.fn(() => ({ eq: eq2 }));
const select = vi.fn(() => ({ eq: eq1 }));
const upsert = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseClient: () => ({
    from: () => ({ select, upsert }),
  }),
}));

function Probe({ week }: { week: number }) {
  const { loading, byKey, setLog } = useTraining('MK', week);
  const log = byKey['D1'];
  return (
    <>
      <p>loading:{String(loading)}</p>
      <p>completed:{String(log?.completed ?? false)}</p>
      <p>rpe:{log?.rpe ?? 'none'}</p>
      <p>extras:{(log?.extraBlocks ?? []).length}</p>
      <button onClick={() => setLog('D1', { completed: true, rpe: 7 })}>save</button>
    </>
  );
}

describe('useTraining', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eq2.mockResolvedValue({ data: [], error: null });
  });

  it('loads training rows for athlete + week', async () => {
    eq2.mockResolvedValueOnce({
      data: [
        {
          week: 1, day_key: 'D1', completed: true, rpe: 7, notes: 'ok',
          custom_blocks: { 0: { name: 'X' } }, extra_blocks: [{ name: 'Extra', sets: '', load: '' }],
          week_note: 'feeling good',
        },
      ],
      error: null,
    });
    render(<Probe week={1} />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    expect(screen.getByText('completed:true')).toBeInTheDocument();
    expect(screen.getByText('rpe:7')).toBeInTheDocument();
    expect(screen.getByText('extras:1')).toBeInTheDocument();
    expect(select).toHaveBeenCalled();
    expect(eq1).toHaveBeenCalledWith('athlete', 'MK');
    expect(eq2).toHaveBeenCalledWith('week', 1);
  });

  it('setLog upserts and updates state optimistically', async () => {
    render(<Probe week={1} />);
    await waitFor(() => expect(screen.getByText('loading:false')).toBeInTheDocument());
    await act(async () => {
      screen.getByText('save').click();
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.athlete).toBe('MK');
    expect(arg.week).toBe(1);
    expect(arg.day_key).toBe('D1');
    expect(arg.completed).toBe(true);
    expect(arg.rpe).toBe(7);
    expect(screen.getByText('completed:true')).toBeInTheDocument();
    expect(screen.getByText('rpe:7')).toBeInTheDocument();
  });

  it('does nothing when athlete is null', async () => {
    function NoAthleteProbe() {
      const { loading } = useTraining(null, 1);
      return <p>l:{String(loading)}</p>;
    }
    render(<NoAthleteProbe />);
    await waitFor(() => expect(screen.getByText('l:false')).toBeInTheDocument());
    expect(select).not.toHaveBeenCalled();
  });
});
