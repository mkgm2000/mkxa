'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, ChefHat, Wallet, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { href: '/home',     label: 'Inicio',   icon: Home     },
  { href: '/training', label: 'Training', icon: Dumbbell },
  { href: '/meals',    label: 'Comidas',  icon: ChefHat  },
  { href: '/expenses', label: 'Gastos',   icon: Wallet   },
  { href: '/profile',  label: 'Perfil',   icon: User     },
];

export function BottomNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom,16px)]"
    >
      <div className="mx-4 mb-2 flex w-full max-w-md justify-around gap-1 rounded-full bg-white/85 px-3 py-2 shadow-nav backdrop-blur">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={clsx(
                'flex h-14 w-14 flex-col items-center justify-center rounded-full transition-transform duration-150 active:scale-95',
                active ? 'text-ink' : 'text-ink-muted'
              )}
            >
              <Icon size={22} strokeWidth={1.5} aria-hidden />
              {active && (
                <span className="mt-1 text-[11px] font-medium leading-none">{label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
