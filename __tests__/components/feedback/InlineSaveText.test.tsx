import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';
import { saveState } from '@/lib/save-state';

describe('InlineSaveText', () => {
  beforeEach(() => {
    act(() => { saveState.getState().set('idle'); });
  });

  it('renders saving and saved labels reactively', () => {
    render(<InlineSaveText />);
    expect(screen.queryByText(/Guardando|Guardado|Error/)).toBeNull();

    act(() => { saveState.getState().set('saving'); });
    expect(screen.getByText('Guardando…')).toBeInTheDocument();

    act(() => { saveState.getState().set('saved'); });
    expect(screen.getByText('Guardado')).toBeInTheDocument();

    act(() => { saveState.getState().set('error', 'Reintentar'); });
    expect(screen.getByText(/Error/)).toBeInTheDocument();
  });
});
