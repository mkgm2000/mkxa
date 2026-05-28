'use client';

import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export interface HeaderActionButtonProps {
  icon: LucideIcon;
  label: string;
  dot?: boolean;
  onClick?: () => void;
  className?: string;
}

export function HeaderActionButton({ icon: Icon, label, dot, onClick, className }: HeaderActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx(
        'relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action',
        'transition-transform duration-150 active:scale-95',
        className
      )}
    >
      <Icon size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
      {dot && (
        <span
          data-testid="header-action-dot"
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger"
          aria-hidden
        />
      )}
    </button>
  );
}
