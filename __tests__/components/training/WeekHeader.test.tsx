import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WeekHeader } from '@/components/training/WeekHeader';

describe('<WeekHeader>', () => {
  it('shows SEMANA N + meta + progress', () => {
    render(
      <WeekHeader
        week={2}
        maxWeek={3}
        done={2}
        total={4}
        meta="11 may – 17 may"
        onPrev={() => {}}
        onNext={() => {}}
      />
    );
    expect(screen.getByText(/SEMANA 2/i)).toBeInTheDocument();
    expect(screen.getByText(/11 may – 17 may/)).toBeInTheDocument();
    expect(screen.getByText(/2\/4 sesiones/)).toBeInTheDocument();
    const bar = screen.getByTestId('week-progress-fill');
    expect(bar.style.width).toBe('50%');
  });

  it('hides forward arrow when at max week', () => {
    const onNext = vi.fn();
    render(
      <WeekHeader week={3} maxWeek={3} done={0} total={4} meta="" onPrev={() => {}} onNext={onNext} />
    );
    const fwd = screen.queryByLabelText('Semana siguiente');
    expect(fwd).toBeNull();
  });

  it('calls onPrev when chevron-left clicked', () => {
    const onPrev = vi.fn();
    render(
      <WeekHeader week={2} maxWeek={3} done={0} total={4} meta="" onPrev={onPrev} onNext={() => {}} />
    );
    fireEvent.click(screen.getByLabelText('Semana anterior'));
    expect(onPrev).toHaveBeenCalled();
  });

  it('disables back at week 1', () => {
    render(
      <WeekHeader week={1} maxWeek={3} done={0} total={4} meta="" onPrev={() => {}} onNext={() => {}} />
    );
    expect(screen.getByLabelText('Semana anterior')).toBeDisabled();
  });
});
