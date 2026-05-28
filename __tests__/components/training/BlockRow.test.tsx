import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BlockRow } from '@/components/training/BlockRow';

describe('<BlockRow>', () => {
  const block = { name: 'Sentadilla', sets: '4x8', load: '30kg' };

  it('renders name + sets + load', () => {
    render(<BlockRow block={block} onSave={() => {}} />);
    expect(screen.getByText('Sentadilla')).toBeInTheDocument();
    expect(screen.getByText('4x8')).toBeInTheDocument();
    expect(screen.getByText(/30kg/)).toBeInTheDocument();
  });

  it('opens editor on tap, saves and closes', () => {
    const onSave = vi.fn();
    render(<BlockRow block={block} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    const nameInput = screen.getByLabelText('Ejercicio') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Sentadilla profunda' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledWith({
      name: 'Sentadilla profunda',
      sets: '4x8',
      load: '30kg',
    });
    // closed
    expect(screen.queryByLabelText('Ejercicio')).toBeNull();
  });

  it('cancel discards changes', () => {
    const onSave = vi.fn();
    render(<BlockRow block={block} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    fireEvent.change(screen.getByLabelText('Ejercicio'), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Ejercicio')).toBeNull();
  });

  it('supports delete callback (extras)', () => {
    const onDelete = vi.fn();
    render(<BlockRow block={block} onSave={() => {}} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('shows rest hint when computed', () => {
    render(<BlockRow block={block} onSave={() => {}} />);
    expect(screen.getByText(/Descanso/)).toBeInTheDocument();
  });
});
