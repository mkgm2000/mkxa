'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';

interface GenerateShoppingButtonProps {
  weekStart: string;
  onGenerated?: (count: number) => void;
}

export function GenerateShoppingButton({ weekStart, onGenerated }: GenerateShoppingButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function trigger() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/meals/generate-shopping', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      const data = await res.json() as { items: { id: string }[] };
      onGenerated?.(data.items?.length ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 pb-4">
      <button
        type="button"
        onClick={trigger}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-action bg-ink py-4 text-[14px] font-bold text-white disabled:opacity-50"
      >
        <ShoppingCart size={18} strokeWidth={1.5} aria-hidden />
        {busy ? 'Generando…' : 'Generar lista de compra'}
      </button>
      {error && <p className="mt-2 text-center text-[12px] text-danger">{error}</p>}
    </div>
  );
}
