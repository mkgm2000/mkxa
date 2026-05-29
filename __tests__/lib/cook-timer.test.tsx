import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCookTimer, formatTimer } from '@/lib/cook-timer';

describe('formatTimer', () => {
  it('formats seconds into mm:ss', () => {
    expect(formatTimer(0)).toBe('00:00');
    expect(formatTimer(59)).toBe('00:59');
    expect(formatTimer(60)).toBe('01:00');
    expect(formatTimer(125)).toBe('02:05');
  });
});

describe('useCookTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('initialises to idle with total = minutes * 60', () => {
    const { result } = renderHook(() => useCookTimer(2));
    expect(result.current.status).toBe('idle');
    expect(result.current.total).toBe(120);
    expect(result.current.remaining).toBe(120);
  });

  it('counts down when started and reaches finished', () => {
    const { result } = renderHook(() => useCookTimer(0.05)); // 3s
    act(() => result.current.start());
    expect(result.current.status).toBe('running');

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.remaining).toBe(2);

    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.status).toBe('finished');
    expect(result.current.remaining).toBe(0);
  });

  it('pause stops the countdown', () => {
    const { result } = renderHook(() => useCookTimer(1));
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.remaining).toBe(55);
    act(() => result.current.pause());
    expect(result.current.status).toBe('paused');
    act(() => { vi.advanceTimersByTime(10000); });
    expect(result.current.remaining).toBe(55);
  });

  it('reset returns to idle with total restored', () => {
    const { result } = renderHook(() => useCookTimer(1));
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(10000); });
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.remaining).toBe(60);
  });

  it('setMinutes updates total and remaining and resets', () => {
    const { result } = renderHook(() => useCookTimer(1));
    act(() => result.current.setMinutes(5));
    expect(result.current.total).toBe(300);
    expect(result.current.remaining).toBe(300);
    expect(result.current.status).toBe('idle');
  });
});
