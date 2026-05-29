'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface Props { text: string; variant: 'weekly' | 'day'; initiallyOpen?: boolean }

export function RationaleNote({ text, variant, initiallyOpen = false }: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const label = variant === 'weekly' ? 'Nota semanal' : 'Justificación';
  return (
    <div className="my-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] font-medium text-ink-muted"
      >
        {label}
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          className={clsx('transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open && <p className="mt-1 text-[13px] italic text-ink-muted">{text}</p>}
    </div>
  );
}
