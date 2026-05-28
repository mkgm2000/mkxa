import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WeekMoodDotsRow } from '@/components/home/WeekMoodDotsRow';

describe('WeekMoodDotsRow', () => {
  it('renders 7 day cells with the weekday labels', () => {
    render(<WeekMoodDotsRow weekStartISO="2026-05-11" todayISO="2026-05-13" logsByDate={{}} />);
    for (const label of ['L','M','X','J','V','S','D']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('marks today with an outer ring', () => {
    render(<WeekMoodDotsRow weekStartISO="2026-05-11" todayISO="2026-05-13" logsByDate={{}} />);
    const cell = screen.getByTestId('day-cell-2026-05-13');
    expect(cell.className).toMatch(/ring/);
  });

  it('fills the cell with the mood color when a log exists', () => {
    render(
      <WeekMoodDotsRow
        weekStartISO="2026-05-11"
        todayISO="2026-05-13"
        logsByDate={{ '2026-05-11': 'happy' }}
      />
    );
    const filled = screen.getByTestId('day-cell-2026-05-11');
    expect(filled.style.backgroundColor).not.toBe('');
  });
});
