'use client';

import { useEffect, useState } from 'react';
import { loadCatalog, getById, type CatalogExercise } from './exercise-catalog';

/**
 * Resolve a dataset exercise id to its catalog entry, loading (and memoising)
 * the catalog on first use. Returns null while loading or when id is null.
 */
export function useExercise(id: string | null): CatalogExercise | null {
  const [ex, setEx] = useState<CatalogExercise | null>(() =>
    id ? getById(id) ?? null : null
  );

  useEffect(() => {
    if (!id) {
      setEx(null);
      return;
    }
    const cached = getById(id);
    if (cached) {
      setEx(cached);
      return;
    }
    // Cache miss: blank out the previous exercise so we never show the wrong
    // gif/description while the catalog loads.
    setEx(null);
    let live = true;
    loadCatalog()
      .then(() => {
        if (live) setEx(getById(id) ?? null);
      })
      .catch(() => {
        // Offline / fetch failure — stay null; loadCatalog will retry next call.
      });
    return () => {
      live = false;
    };
  }, [id]);

  return ex;
}
