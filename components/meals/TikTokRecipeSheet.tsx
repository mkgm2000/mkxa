'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Play } from 'lucide-react';
import { TikTokEmbed } from '@/components/meals/TikTokEmbed';
import { mealSlotLabel } from '@/lib/meals/recipes';
import type { Recipe } from '@/lib/meals/recipes';

interface TikTokRecipeSheetProps {
  recipe: Recipe | null;
  onClose: () => void;
}

export function TikTokRecipeSheet({ recipe, onClose }: TikTokRecipeSheetProps) {
  const router = useRouter();
  const open = recipe !== null && recipe.source_type === 'tiktok';

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || !recipe) return null;

  const label = recipe.meal_type ? mealSlotLabel(recipe.meal_type) : 'Sin tipo';

  function handleCook() {
    if (!recipe) return;
    router.push(`/meals/cook/${recipe.id}`);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Video receta: ${recipe.title}`}
      data-state={open ? 'open' : 'closed'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 py-6 backdrop-blur-sm transition-opacity duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-md flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end">
          <button
            type="button"
            aria-label="Cerrar video"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-transform duration-150 active:scale-95"
          >
            <X size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-hidden">
          <TikTokEmbed url={recipe.source_url} />
        </div>

        <div className="flex flex-col gap-1 px-1 text-center">
          <h2 className="font-sans text-[18px] font-extrabold leading-tight text-white">
            {recipe.title}
          </h2>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/60">
            {label}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCook}
          className="mx-auto mt-1 flex w-full items-center justify-center gap-2 rounded-action bg-white px-5 py-3.5 text-[14px] font-bold text-ink shadow-action transition-transform duration-150 active:scale-[0.98]"
        >
          <Play size={16} strokeWidth={2} aria-hidden />
          Cocinar siguiendo el vídeo
        </button>
      </div>
    </div>
  );
}
