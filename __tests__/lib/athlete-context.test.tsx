import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AthleteProvider, useAthlete, setAthlete } from '@/lib/athlete-context';

function Probe() {
  const a = useAthlete();
  return <p>athlete:{a ?? 'none'}</p>;
}

describe('athlete context', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reads from localStorage on mount, then writes back on setAthlete', () => {
    window.localStorage.setItem('mkxa.athlete', 'MK');
    render(<AthleteProvider><Probe /></AthleteProvider>);
    expect(screen.getByText('athlete:MK')).toBeInTheDocument();

    act(() => { setAthlete('Xabi'); });
    expect(screen.getByText('athlete:Xabi')).toBeInTheDocument();
    expect(window.localStorage.getItem('mkxa.athlete')).toBe('Xabi');
  });
});
