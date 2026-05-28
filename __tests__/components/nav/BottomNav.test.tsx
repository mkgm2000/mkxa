import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BottomNav } from '@/components/nav/BottomNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
}));

describe('BottomNav', () => {
  it('renders 5 nav items with accessible labels', () => {
    render(<BottomNav />);
    for (const name of ['Inicio', 'Training', 'Comidas', 'Gastos', 'Perfil']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
  });

  it('marks the active route', () => {
    render(<BottomNav />);
    const home = screen.getByRole('link', { name: 'Inicio' });
    expect(home).toHaveAttribute('aria-current', 'page');
  });
});
