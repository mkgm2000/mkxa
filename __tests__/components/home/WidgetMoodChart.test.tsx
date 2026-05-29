import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WidgetMoodChart } from '@/components/home/WidgetMoodChart';

describe('WidgetMoodChart', () => {
  it('renders 7 day labels even with no logs', () => {
    render(
      <WidgetMoodChart
        weekStartISO="2026-05-25"
        todayISO="2026-05-29"
        logsByDate={{}}
      />
    );
    for (const l of ['L', 'M', 'X', 'J', 'V', 'S', 'D']) {
      expect(screen.getAllByText(l).length).toBeGreaterThan(0);
    }
  });

  it('shows today mood label when logged', () => {
    render(
      <WidgetMoodChart
        weekStartISO="2026-05-25"
        todayISO="2026-05-29"
        logsByDate={{ '2026-05-29': 'love' }}
      />
    );
    expect(screen.getByText(/Enamorado/)).toBeInTheDocument();
  });
});
