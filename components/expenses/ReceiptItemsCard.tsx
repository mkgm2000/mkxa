import type { ReceiptData } from '@/lib/expenses';

export interface ReceiptItemsCardProps {
  receipt: ReceiptData | null;
}

export function ReceiptItemsCard({ receipt }: ReceiptItemsCardProps) {
  if (!receipt) return null;
  const { items, subtotal, tax_amount, tax_rate, tax_included } = receipt;
  const hasItems = items && items.length > 0;
  const hasTaxBlock = subtotal != null || tax_amount != null || tax_included;
  if (!hasItems && !hasTaxBlock) return null;

  return (
    <section className="rounded-card bg-white p-4 shadow-card">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        Artículos
      </p>
      {hasItems && (
        <ul className="divide-y divide-ink-soft/40">
          {items.map((it, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-sm font-medium text-ink">{it.name}</p>
                {(it.qty != null || it.unit_price != null) && (
                  <p className="text-[11px] text-ink-muted">
                    {it.qty != null ? `${it.qty} × ` : ''}
                    {it.unit_price != null ? `${it.unit_price.toFixed(2)} €` : ''}
                  </p>
                )}
              </div>
              <span className="font-sans text-sm font-bold text-ink">
                {it.line_total != null ? `${it.line_total.toFixed(2)} €` : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {hasTaxBlock && (
        <div className="mt-3 border-t border-ink-soft/40 pt-2 text-[12px] text-ink-muted">
          {subtotal != null && (
            <div className="flex justify-between">
              <span>Base</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
          )}
          {tax_amount != null && (
            <div className="flex justify-between">
              <span>IVA{tax_rate != null ? ` (${tax_rate}%)` : ''}</span>
              <span>{tax_amount.toFixed(2)} €</span>
            </div>
          )}
          {tax_amount == null && tax_included && (
            <div className="flex justify-between">
              <span>IVA</span>
              <span>incluido</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
