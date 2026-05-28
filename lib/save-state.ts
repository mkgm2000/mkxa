import { create } from 'zustand';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveState {
  status: SaveStatus;
  message?: string;
  set: (s: SaveStatus, m?: string) => void;
}

export const saveState = create<SaveState>((set) => ({
  status: 'idle',
  set: (status, message) => set({ status, message }),
}));
