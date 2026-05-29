import { aisleLabel, type Aisle } from '@/lib/meals/recipes';

export function ShoppingSectionHeader({ aisle }: { aisle: Aisle }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-4 pb-1.5">
      <span className="h-px w-3 bg-ink-soft" aria-hidden />
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        {aisleLabel(aisle)}
      </span>
      <span className="h-px flex-1 bg-ink-soft" aria-hidden />
    </div>
  );
}
