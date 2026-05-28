import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom 25 + Node 20+ sometimes loses window.localStorage; provide a stable
// in-memory implementation so tests can rely on it regardless of host quirks.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(i: number) { return Array.from(this.map.keys())[i] ?? null; }
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

if (typeof window !== 'undefined') {
  if (!(window as { localStorage?: Storage }).localStorage) {
    Object.defineProperty(window, 'localStorage', { value: new MemoryStorage() });
  }
  if (!(window as { sessionStorage?: Storage }).sessionStorage) {
    Object.defineProperty(window, 'sessionStorage', { value: new MemoryStorage() });
  }
}

afterEach(() => {
  cleanup();
  if (typeof window !== 'undefined') {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  }
});
