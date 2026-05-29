import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoodHistoryChart } from '@/components/profile/MoodHistoryChart';

vi.mock('@/lib/supabase/client', () => {
  const order = vi.fn().mockResolvedValue({ data: [] });
  const gte = vi.fn(() => ({ order }));
  const eq = vi.fn(() => ({ gte }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return {
    supabaseClient: () => ({ from }),
  };
});

describe('MoodHistoryChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders eyebrow, 14 mood cells, and caption with 0 logs', async () => {
    render(<MoodHistoryChart athlete="xabi" />);

    expect(screen.getByText(/Mood últimas 2 semanas/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByTestId('mood-cell')).toHaveLength(14);
    });

    expect(screen.getByText(/0 de 14 días con registro/)).toBeInTheDocument();
  });
});
