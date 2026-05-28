import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RpeModal } from '@/components/training/RpeModal';

describe('<RpeModal>', () => {
  it('renders 10 RPE chips when open', () => {
    render(
      <RpeModal
        open
        dayKey="D1"
        title="Fuerza"
        rpe={null}
        notes=""
        onSelectRpe={() => {}}
        onChangeNotes={() => {}}
        onSave={() => {}}
        onClose={() => {}}
      />
    );
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByRole('button', { name: `RPE ${i}` })).toBeInTheDocument();
    }
  });

  it('returns null when closed', () => {
    const { container } = render(
      <RpeModal
        open={false}
        dayKey="D1"
        title="Fuerza"
        rpe={null}
        notes=""
        onSelectRpe={() => {}}
        onChangeNotes={() => {}}
        onSave={() => {}}
        onClose={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('calls onSelectRpe when chip clicked', () => {
    const onSelectRpe = vi.fn();
    render(
      <RpeModal
        open
        dayKey="D1"
        title="Fuerza"
        rpe={null}
        notes=""
        onSelectRpe={onSelectRpe}
        onChangeNotes={() => {}}
        onSave={() => {}}
        onClose={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'RPE 7' }));
    expect(onSelectRpe).toHaveBeenCalledWith(7);
  });

  it('marks selected chip with aria-pressed', () => {
    render(
      <RpeModal
        open
        dayKey="D1"
        title="Fuerza"
        rpe={5}
        notes=""
        onSelectRpe={() => {}}
        onChangeNotes={() => {}}
        onSave={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'RPE 5' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'RPE 6' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('changes notes via textarea', () => {
    const onChangeNotes = vi.fn();
    render(
      <RpeModal
        open
        dayKey="D1"
        title="Fuerza"
        rpe={null}
        notes=""
        onSelectRpe={() => {}}
        onChangeNotes={onChangeNotes}
        onSave={() => {}}
        onClose={() => {}}
      />
    );
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: 'hola' } });
    expect(onChangeNotes).toHaveBeenCalledWith('hola');
  });

  it('save button triggers onSave', () => {
    const onSave = vi.fn();
    render(
      <RpeModal
        open
        dayKey="D1"
        title="Fuerza"
        rpe={null}
        notes=""
        onSelectRpe={() => {}}
        onChangeNotes={() => {}}
        onSave={onSave}
        onClose={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it('clicking overlay calls onClose', () => {
    const onClose = vi.fn();
    render(
      <RpeModal
        open
        dayKey="D1"
        title="Fuerza"
        rpe={null}
        notes=""
        onSelectRpe={() => {}}
        onChangeNotes={() => {}}
        onSave={() => {}}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId('rpe-overlay'));
    expect(onClose).toHaveBeenCalled();
  });
});
