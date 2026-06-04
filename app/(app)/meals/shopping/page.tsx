'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { ShoppingList } from '@/components/meals/ShoppingList';
import { FinishShoppingSheet } from '@/components/meals/FinishShoppingSheet';
import { useShoppingList } from '@/lib/hooks/use-shopping-list';
import { useRecipes } from '@/lib/hooks/use-recipes';
import { nextWeekStart } from '@/lib/hooks/use-meal-plan';

export default function ShoppingPage() {
  const router = useRouter();
  const weekStart = useMemo(() => nextWeekStart(), []);
  const { items, toggleChecked, addManual, finish } = useShoppingList(weekStart);
  const { recipes } = useRecipes();
  const [finishOpen, setFinishOpen] = useState(false);

  const recipeNamesById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of recipes) m[r.id] = r.title;
    return m;
  }, [recipes]);

  return (
    <main className="flex flex-col gap-3 px-1 pt-4 pb-6">
      <header className="flex items-center justify-between px-4">
        <Link href="/meals" aria-label="Volver" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-action">
          <ChevronLeft size={20} strokeWidth={1.5} className="text-ink" aria-hidden />
        </Link>
        <h1 className="font-sans text-[20px] font-extrabold tracking-tightest text-ink">Compra</h1>
        <span aria-hidden className="h-10 w-10" />
      </header>

      <ShoppingList items={items} onToggle={toggleChecked} onAddManual={addManual} recipeNamesById={recipeNamesById} />

      {items.length > 0 && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setFinishOpen(true)}
            className="w-full rounded-action bg-ink py-4 text-[14px] font-bold text-white"
          >
            Finalizar compra
          </button>
        </div>
      )}

      <FinishShoppingSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        checkedCount={items.filter((i) => i.checked).length}
        onFinish={async (input) => {
          const res = await finish(input);
          if (res && 'expense_id' in res && res.expense_id) {
            router.push(`/expenses/${res.expense_id}`);
          }
          return res;
        }}
      />
    </main>
  );
}
