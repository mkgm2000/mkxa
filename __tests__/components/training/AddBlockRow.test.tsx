import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AddBlockRow } from '@/components/training/AddBlockRow';

describe('<AddBlockRow>', () => {
  it('starts collapsed showing the add button', () => {
    render(<AddBlockRow onAdd={() => {}} />);
    expect(screen.getByRole('button', { name: /añadir bloque/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Ejercicio')).toBeNull();
  });

  it('expands on click and calls onAdd with trimmed values', () => {
    const onAdd = vi.fn();
    render(<AddBlockRow onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: /añadir bloque/i }));
    fireEvent.change(screen.getByLabelText('Ejercicio'), { target: { value: '  Burpees  ' } });
    fireEvent.change(screen.getByLabelText('Series'), { target: { value: '3x10' } });
    fireEvent.change(screen.getByLabelText('Carga'), { target: { value: 'BW' } });
    fireEvent.click(screen.getByRole('button', { name: /^añadir$/i }));
    expect(onAdd).toHaveBeenCalledWith({ name: 'Burpees', sets: '3x10', load: 'BW' });
  });

  it('does not call onAdd when name is empty', () => {
    const onAdd = vi.fn();
    render(<AddBlockRow onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: /añadir bloque/i }));
    fireEvent.click(screen.getByRole('button', { name: /^añadir$/i }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('cancel collapses without calling onAdd', () => {
    const onAdd = vi.fn();
    render(<AddBlockRow onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: /añadir bloque/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /añadir bloque/i })).toBeInTheDocument();
  });
});
