'use client';

import { Check } from 'lucide-react';
import { useEffect } from 'react';
import { saveState } from '@/lib/save-state';

export function InlineSaveText() {
  const status  = saveState((s) => s.status);
  const message = saveState((s) => s.message);

  useEffect(() => {
    if (status !== 'saved') return;
    const t = setTimeout(() => saveState.getState().set('idle'), 1500);
    return () => clearTimeout(t);
  }, [status]);

  if (status === 'idle') return null;

  if (status === 'saving') {
    return <p className="text-xs text-ink-muted">Guardando…</p>;
  }
  if (status === 'saved') {
    return (
      <p className="flex items-center gap-1 text-xs text-ink-muted">
        Guardado <Check size={12} strokeWidth={1.5} aria-hidden />
      </p>
    );
  }
  return (
    <p className="text-xs text-danger">
      Error al guardar{message ? ` · ${message}` : ''}
    </p>
  );
}
