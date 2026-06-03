-- Add OpenFoodFacts metadata to pantry + shopping items. image_url is the
-- raw OFF image URL (images.openfoodfacts.org). off_barcode is the EAN/
-- internal id we can use to re-fetch / dedupe across pantry and shopping.

alter table pantry_items
  add column if not exists image_url   text,
  add column if not exists off_barcode text;

alter table shopping_list
  add column if not exists image_url   text,
  add column if not exists off_barcode text;

create index if not exists pantry_items_off_barcode_idx  on pantry_items (off_barcode);
create index if not exists shopping_list_off_barcode_idx on shopping_list (off_barcode);
