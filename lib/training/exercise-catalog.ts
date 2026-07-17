// Loader for the vendored exercise catalog (public/exercise-catalog.json).
// ES-only strip of hasaneyldrm/exercises-dataset (1324 exercises). Metadata
// is MIT; the media (gif/thumb) is © Gym visual — see exercise-media.ts.
//
// The JSON is ~930KB so it is NOT bundled: it is fetched once on demand and
// memoised for the tab session. Service worker caches it for offline use.

export interface CatalogExercise {
  id: string;
  name: string;
  body_part: string;
  equipment: string;
  target: string;
  muscle_group: string;
  secondary: string[];
  steps: string[];
}

let cache: CatalogExercise[] | null = null;
let byId: Map<string, CatalogExercise> | null = null;
let inflight: Promise<CatalogExercise[]> | null = null;

export async function loadCatalog(): Promise<CatalogExercise[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch('/exercise-catalog.json')
    .then((r) => {
      if (!r.ok) throw new Error(`catalog fetch ${r.status}`);
      return r.json();
    })
    .then((data: CatalogExercise[]) => {
      cache = data;
      byId = new Map(data.map((e) => [e.id, e]));
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Synchronous lookup — only returns once loadCatalog() has resolved. */
export function getById(id: string): CatalogExercise | undefined {
  return byId?.get(id);
}
