import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GreetingHeader } from '@/components/home/GreetingHeader';

vi.mock('@/lib/hooks/use-athlete-profile', () => ({
  useAthleteProfile: () => ({ profile: { athlete: 'MK', avatar_url: null }, loading: false, refresh: vi.fn() }),
}));

describe('GreetingHeader', () => {
  it('shows Buenos días for morning hours', () => {
    render(<GreetingHeader athlete="MK" now={new Date('2026-05-28T08:00:00')} todayMood="joyful" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Buenos días, MK/);
  });

  it('shows Buenas tardes for afternoon hours', () => {
    render(<GreetingHeader athlete="Xabi" now={new Date('2026-05-28T17:00:00')} todayMood="happy" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Buenas tardes, Xabi/);
  });

  it('shows the logged mood label as subtitle', () => {
    render(<GreetingHeader athlete="MK" now={new Date('2026-05-28T10:00:00')} todayMood="sleepy" />);
    expect(screen.getByText(/Adormilado/)).toBeInTheDocument();
  });

  it('links the avatar circle to /profile', () => {
    render(<GreetingHeader athlete="MK" now={new Date('2026-05-28T10:00:00')} todayMood="happy" />);
    expect(screen.getByRole('link', { name: /perfil/i })).toHaveAttribute('href', '/profile');
  });
});
