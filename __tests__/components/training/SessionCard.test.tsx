import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionCard } from '@/components/training/SessionCard';
import type { Day } from '@/lib/plan-hyrox';

const day: Day = {
  key: 'D1',
  title: 'Fuerza',
  rpe: 'RPE 6-7',
  blocks: [
    { name: 'Sentadilla', sets: '4x8', load: '30kg' },
    { name: 'Plancha', sets: '3x30"', load: 'BW' },
  ],
};

function renderCard(overrides: Partial<React.ComponentProps<typeof SessionCard>> = {}) {
  return render(
    <SessionCard
      day={day}
      log={null}
      onCheck={() => {}}
      onUncheck={() => {}}
      onOpenRpe={() => {}}
      onSaveBlock={() => {}}
      onAddExtra={() => {}}
      onSaveExtra={() => {}}
      onDeleteExtra={() => {}}
      {...overrides}
    />
  );
}

describe('<SessionCard>', () => {
  it('shows D1 pill + title closed by default', () => {
    renderCard();
    expect(screen.getByText('D1')).toBeInTheDocument();
    expect(screen.getByText('Fuerza')).toBeInTheDocument();
    // collapsed: blocks not visible
    expect(screen.queryByText('Sentadilla')).toBeNull();
  });

  it('expands on header click and shows blocks + add row', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByText('Sentadilla')).toBeInTheDocument();
    expect(screen.getByText('Plancha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /añadir bloque/i })).toBeInTheDocument();
  });

  it('clicking circle triggers onCheck when not completed', () => {
    const onCheck = vi.fn();
    renderCard({ onCheck });
    fireEvent.click(screen.getByRole('button', { name: /marcar completada/i }));
    expect(onCheck).toHaveBeenCalled();
  });

  it('clicking circle triggers onUncheck when completed', () => {
    const onUncheck = vi.fn();
    renderCard({
      log: { completed: true, rpe: 7, notes: null, customBlocks: {}, extraBlocks: [], weekNote: null },
      onUncheck,
    });
    fireEvent.click(screen.getByRole('button', { name: /quitar completada/i }));
    expect(onUncheck).toHaveBeenCalled();
  });

  it('shows RPE meta + green border when completed', () => {
    renderCard({
      log: { completed: true, rpe: 8, notes: null, customBlocks: {}, extraBlocks: [], weekNote: null },
    });
    expect(screen.getByText('RPE 8')).toBeInTheDocument();
    const card = screen.getByTestId('session-card');
    expect(card.className).toMatch(/border/);
  });

  it('renders custom block names override default', () => {
    renderCard({
      log: {
        completed: false, rpe: null, notes: null,
        customBlocks: { 0: { name: 'Sentadilla profunda' } },
        extraBlocks: [], weekNote: null,
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByText('Sentadilla profunda')).toBeInTheDocument();
  });

  it('renders extras and supports delete', () => {
    const onDeleteExtra = vi.fn();
    renderCard({
      log: {
        completed: false, rpe: null, notes: null, customBlocks: {},
        extraBlocks: [{ name: 'Burpees', sets: '3x10', load: 'BW' }],
        weekNote: null,
      },
      onDeleteExtra,
    });
    fireEvent.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByText('Burpees')).toBeInTheDocument();
    // open editor on extra → click delete
    fireEvent.click(screen.getByRole('button', { name: /editar Burpees/i }));
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    expect(onDeleteExtra).toHaveBeenCalledWith(0);
  });

  it('clicking RPE button opens modal callback', () => {
    const onOpenRpe = vi.fn();
    renderCard({
      log: { completed: true, rpe: 7, notes: null, customBlocks: {}, extraBlocks: [], weekNote: null },
      onOpenRpe,
    });
    fireEvent.click(screen.getByRole('button', { name: /toggle/i }));
    fireEvent.click(screen.getByRole('button', { name: /editar registro/i }));
    expect(onOpenRpe).toHaveBeenCalled();
  });
});
