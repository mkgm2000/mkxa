import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressHeatmap, type HeatRow } from '@/components/training/ProgressHeatmap';

describe('<ProgressHeatmap>', () => {
  const rows: HeatRow[] = [
    { week: 1, D1: { rpe: 7, completed: true }, D2: { rpe: null, completed: true }, D3: null, D4: null },
    { week: 2, D1: null, D2: null, D3: { rpe: 9, completed: true }, D4: null },
  ];

  it('renders week column headers', () => {
    render(<ProgressHeatmap rows={rows} />);
    expect(screen.getByText('S1')).toBeInTheDocument();
    expect(screen.getByText('S2')).toBeInTheDocument();
  });

  it('renders 4 day rows D1..D4', () => {
    render(<ProgressHeatmap rows={rows} />);
    ['D1', 'D2', 'D3', 'D4'].forEach((d) => {
      expect(screen.getByText(d)).toBeInTheDocument();
    });
  });

  it('cell shows RPE number when present', () => {
    render(<ProgressHeatmap rows={rows} />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('cell shows check tick when completed without RPE', () => {
    render(<ProgressHeatmap rows={rows} />);
    expect(screen.getByLabelText('Semana 1 D2 sin RPE, completada')).toBeInTheDocument();
  });

  it('renders dot for empty cells', () => {
    render(<ProgressHeatmap rows={rows} />);
    expect(screen.getAllByText('·').length).toBeGreaterThan(0);
  });
});
