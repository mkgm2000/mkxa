export interface RecipeCollectionItem {
  video_url: string;
  title: string;
  thumbnail: string | null;
  author: string | null;
}

export type CollectionImportPhase = 'queued' | 'extracting' | 'saving' | 'completed' | 'failed';

export interface CollectionImportProgressJson {
  phase: CollectionImportPhase;
  processed: number;
  total: number;
  message: string;
}

export interface RecipeCollection {
  id: string;
  title: string;
  source_url: string;
  source_type: 'tiktok' | 'instagram';
  items: RecipeCollectionItem[];
  item_count: number;
  cover_url: string | null;
  created_by: 'MK' | 'Xabi' | null;
  // Import lifecycle — the workflow updates these as it runs. A completed
  // collection has `import_status: 'completed'` (or null for older rows
  // that predate the import flow).
  import_status: CollectionImportPhase | null;
  import_progress: CollectionImportProgressJson | null;
  import_started_at: string | null;
  created_at: string;
  updated_at: string;
}
