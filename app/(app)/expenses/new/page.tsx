'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';

export default function NewExpensePage() {
  return (
    <main className="flex flex-col gap-5 px-5 pt-4">
      <header className="flex items-center gap-3">
        <Link
          href="/expenses"
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action transition-transform duration-150 active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-2xl font-extrabold tracking-tightest text-ink">
          Añadir gasto
        </h1>
      </header>

      <InlineSaveText />

      <ExpenseForm />
    </main>
  );
}
