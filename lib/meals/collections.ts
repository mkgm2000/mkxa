export interface RecipeCollectionItem {
  video_url: string;
  title: string;
  thumbnail: string | null;
  author: string | null;
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
  created_at: string;
  updated_at: string;
}
