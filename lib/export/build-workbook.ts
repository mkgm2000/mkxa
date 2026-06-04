import ExcelJS from 'exceljs';
import { supabaseServer } from '@/lib/supabase/server';

// Shared workbook-building logic used by both the manual download route
// (`/api/export`) and the weekly cron job (`/api/cron/backup-email`).
// Keeping this in one place ensures the manual export and the emailed
// backup always contain the same data shape.

type ColumnDef = {
  header: string;
  key: string;
  width: number;
  // Optional transform applied per row (e.g. array -> joined string).
  map?: (value: unknown, row: Record<string, unknown>) => unknown;
};

type SheetSpec = {
  name: string;
  table: string;
  // Columns selected from the DB. We pass these to `.select()` and they also
  // drive the worksheet columns (1:1 unless `map` rewrites the value).
  columns: ColumnDef[];
  // Optional order: column name + ascending flag.
  orderBy?: { column: string; ascending?: boolean };
};

function joinArr(sep: string) {
  return (value: unknown) => (Array.isArray(value) ? value.join(sep) : value ?? '');
}

const SHEETS: SheetSpec[] = [
  {
    name: 'Restaurantes',
    table: 'restaurants',
    orderBy: { column: 'created_at', ascending: false },
    columns: [
      { header: 'id', key: 'id', width: 38 },
      { header: 'name', key: 'name', width: 28 },
      { header: 'cuisine', key: 'cuisine', width: 16 },
      { header: 'location', key: 'location', width: 24 },
      { header: 'status', key: 'status', width: 12 },
      { header: 'added_by', key: 'added_by', width: 10 },
      { header: 'rating', key: 'rating', width: 8 },
      { header: 'price_tier', key: 'price_tier', width: 10 },
      { header: 'notes', key: 'notes', width: 40 },
      { header: 'visited_at', key: 'visited_at', width: 14 },
      { header: 'image_url', key: 'image_url', width: 40 },
      { header: 'maps_url', key: 'maps_url', width: 40 },
      { header: 'website', key: 'website', width: 40 },
      { header: 'created_at', key: 'created_at', width: 22 },
      { header: 'updated_at', key: 'updated_at', width: 22 },
    ],
  },
  {
    name: 'Recetas',
    table: 'recipes',
    orderBy: { column: 'created_at', ascending: false },
    columns: [
      { header: 'id', key: 'id', width: 38 },
      { header: 'title', key: 'title', width: 32 },
      { header: 'meal_type', key: 'meal_type', width: 12 },
      { header: 'prep_minutes', key: 'prep_minutes', width: 12 },
      { header: 'servings', key: 'servings', width: 10 },
      { header: 'tags', key: 'tags', width: 28, map: joinArr(', ') },
      { header: 'notes', key: 'notes', width: 40 },
      { header: 'created_by', key: 'created_by', width: 10 },
      { header: 'created_at', key: 'created_at', width: 22 },
      { header: 'source_url', key: 'source_url', width: 40 },
      { header: 'source_type', key: 'source_type', width: 12 },
      { header: 'thumbnail_url', key: 'thumbnail_url', width: 40 },
    ],
  },
  {
    name: 'Pelis_Series',
    table: 'media_items',
    orderBy: { column: 'created_at', ascending: false },
    columns: [
      { header: 'id', key: 'id', width: 38 },
      { header: 'tmdb_id', key: 'tmdb_id', width: 12 },
      { header: 'media_type', key: 'media_type', width: 12 },
      { header: 'title', key: 'title', width: 32 },
      { header: 'providers', key: 'providers', width: 24, map: joinArr(' · ') },
      { header: 'genres', key: 'genres', width: 24, map: joinArr(', ') },
      { header: 'status', key: 'status', width: 12 },
      { header: 'added_by', key: 'added_by', width: 10 },
      { header: 'rating_mk', key: 'rating_mk', width: 10 },
      { header: 'rating_xabi', key: 'rating_xabi', width: 10 },
      { header: 'watched_at', key: 'watched_at', width: 14 },
      { header: 'vote_average', key: 'vote_average', width: 12 },
      { header: 'release_date', key: 'release_date', width: 14 },
      { header: 'runtime_minutes', key: 'runtime_minutes', width: 14 },
      { header: 'notes', key: 'notes', width: 40 },
      { header: 'created_at', key: 'created_at', width: 22 },
    ],
  },
  {
    name: 'Gastos',
    table: 'expenses',
    // The schema uses `date` for the event day; we expose it as `occurred_at`
    // to match the spec's user-facing column name.
    orderBy: { column: 'date', ascending: false },
    columns: [
      { header: 'id', key: 'id', width: 38 },
      { header: 'amount', key: 'amount', width: 10 },
      { header: 'category', key: 'category', width: 14 },
      { header: 'description', key: 'description', width: 40 },
      { header: 'paid_by', key: 'paid_by', width: 12 },
      { header: 'occurred_at', key: 'occurred_at', width: 14, map: (_, row) => row.date ?? '' },
      { header: 'merchant', key: 'merchant', width: 24 },
      { header: 'created_at', key: 'created_at', width: 22 },
    ],
  },
  {
    name: 'Despensa',
    table: 'pantry_items',
    orderBy: { column: 'updated_at', ascending: false },
    columns: [
      { header: 'id', key: 'id', width: 38 },
      { header: 'name', key: 'name', width: 28 },
      { header: 'aisle', key: 'aisle', width: 16 },
      { header: 'in_stock', key: 'in_stock', width: 10 },
      { header: 'units', key: 'units', width: 8 },
      { header: 'image_url', key: 'image_url', width: 40 },
      { header: 'off_barcode', key: 'off_barcode', width: 16 },
      { header: 'updated_at', key: 'updated_at', width: 22 },
    ],
  },
  {
    name: 'Compra',
    table: 'shopping_list',
    orderBy: { column: 'created_at', ascending: false },
    columns: [
      { header: 'id', key: 'id', width: 38 },
      { header: 'week_start', key: 'week_start', width: 14 },
      { header: 'name', key: 'name', width: 28 },
      { header: 'quantity', key: 'quantity', width: 10 },
      { header: 'unit', key: 'unit', width: 10 },
      { header: 'aisle', key: 'aisle', width: 16 },
      { header: 'source', key: 'source', width: 10 },
      { header: 'checked', key: 'checked', width: 10 },
      { header: 'archived', key: 'archived', width: 10 },
      { header: 'image_url', key: 'image_url', width: 40 },
      { header: 'off_barcode', key: 'off_barcode', width: 16 },
      { header: 'created_at', key: 'created_at', width: 22 },
    ],
  },
  {
    name: 'Mood',
    table: 'mood_logs',
    orderBy: { column: 'date', ascending: false },
    columns: [
      { header: 'id', key: 'id', width: 38 },
      { header: 'athlete', key: 'athlete', width: 10 },
      { header: 'date', key: 'date', width: 14 },
      { header: 'mood', key: 'mood', width: 12 },
      { header: 'note', key: 'note', width: 40 },
      // mood_logs has no updated_at; we leave the column but fall back to created_at.
      { header: 'updated_at', key: 'updated_at', width: 22, map: (_, row) => row.created_at ?? '' },
    ],
  },
  {
    name: 'Training',
    table: 'registros',
    orderBy: { column: 'updated_at', ascending: false },
    columns: [
      { header: 'id', key: 'id', width: 38 },
      { header: 'athlete', key: 'athlete', width: 10 },
      { header: 'week', key: 'week', width: 8 },
      { header: 'day_key', key: 'day_key', width: 10 },
      { header: 'completed', key: 'completed', width: 10 },
      { header: 'rpe', key: 'rpe', width: 8 },
      { header: 'notes', key: 'notes', width: 40 },
      { header: 'updated_at', key: 'updated_at', width: 22 },
    ],
  },
  {
    name: 'Pases',
    table: 'meal_passes',
    orderBy: { column: 'month_key', ascending: false },
    columns: [
      { header: 'id', key: 'id', width: 38 },
      { header: 'month_key', key: 'month_key', width: 12 },
      { header: 'idx', key: 'idx', width: 6 },
      { header: 'redeemed', key: 'redeemed', width: 10 },
      { header: 'redeemed_at', key: 'redeemed_at', width: 22 },
      { header: 'place', key: 'place', width: 24 },
      { header: 'kind', key: 'kind', width: 12 },
      { header: 'note', key: 'note', width: 40 },
      { header: 'created_at', key: 'created_at', width: 22 },
    ],
  },
  {
    name: 'Colecciones',
    table: 'recipe_collections',
    orderBy: { column: 'created_at', ascending: false },
    columns: [
      { header: 'id', key: 'id', width: 38 },
      { header: 'title', key: 'title', width: 32 },
      { header: 'source_url', key: 'source_url', width: 40 },
      { header: 'source_type', key: 'source_type', width: 12 },
      { header: 'item_count', key: 'item_count', width: 10 },
      { header: 'cover_url', key: 'cover_url', width: 40 },
      { header: 'created_by', key: 'created_by', width: 10 },
      { header: 'created_at', key: 'created_at', width: 22 },
    ],
  },
];

export function todayStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Build the unique set of source columns we need from the DB for each sheet.
// Some output columns (e.g. Gastos.occurred_at) are derived from a different
// DB column (`date`) via `map`, so we always include the original key too.
function dbSelectFor(spec: SheetSpec): string {
  const cols = new Set<string>();
  for (const c of spec.columns) cols.add(c.key);
  // Hand-rolled extras for mapped columns that read from a different DB col.
  if (spec.table === 'expenses') cols.add('date');
  if (spec.table === 'mood_logs') cols.add('created_at');
  return Array.from(cols).join(',');
}

/**
 * Build the full mkxa backup workbook and return its xlsx buffer.
 * Used by both the manual `/api/export` route and the weekly cron job.
 *
 * Returns the raw value from exceljs (`ArrayBuffer`-like) so the manual
 * download route can hand it straight to `NextResponse` without copying.
 * The cron route wraps it with `Buffer.from(...)` for Resend's attachment.
 */
export async function buildWorkbookBuffer(): Promise<ArrayBuffer> {
  const supa = supabaseServer();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'mkxa';
  workbook.created = new Date();

  for (const spec of SHEETS) {
    const ws = workbook.addWorksheet(spec.name);
    ws.columns = spec.columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

    // Style + freeze the header row.
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle' };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    // Fetch and append rows. If the query errors (e.g. missing column), we
    // still leave the headers in place rather than aborting the whole export.
    let query = supa.from(spec.table).select(dbSelectFor(spec));
    if (spec.orderBy) {
      query = query.order(spec.orderBy.column, { ascending: spec.orderBy.ascending ?? false });
    }
    const { data, error } = await query;
    if (error) {
      console.error(`[export] ${spec.table} fetch failed:`, error.message);
      continue;
    }
    const rows = ((data ?? []) as unknown) as Record<string, unknown>[];
    for (const row of rows) {
      const out: Record<string, unknown> = {};
      for (const col of spec.columns) {
        const raw = row[col.key];
        out[col.key] = col.map ? col.map(raw, row) : raw ?? '';
      }
      ws.addRow(out);
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return arrayBuffer as ArrayBuffer;
}
