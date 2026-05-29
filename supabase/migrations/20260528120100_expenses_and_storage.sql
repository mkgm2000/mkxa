-- Expenses table + storage bucket for receipts.
-- Open RLS policies to match the legacy access model (single tenant, no auth).

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'EUR',
  category text not null check (category in (
    'comida','casa','transporte','ocio','salud','suscripciones','otros'
  )),
  date date not null,
  paid_by text not null check (paid_by in ('MK','Xabi','Compartido')),
  description text,
  merchant text,
  receipt_url text,
  receipt_data jsonb,
  created_by text not null check (created_by in ('MK','Xabi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_date_idx     on expenses (date desc);
create index if not exists expenses_category_idx on expenses (category, date desc);
create index if not exists expenses_paid_by_idx  on expenses (paid_by, date desc);

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists expenses_updated_at on expenses;
create trigger expenses_updated_at
  before update on expenses
  for each row execute function set_updated_at();

alter table expenses enable row level security;

drop policy if exists "open expenses" on expenses;
create policy "open expenses" on expenses for all using (true) with check (true);

-- Storage bucket for receipt images (private, signed URLs only).
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "open receipts read"   on storage.objects;
drop policy if exists "open receipts write"  on storage.objects;
drop policy if exists "open receipts update" on storage.objects;
drop policy if exists "open receipts delete" on storage.objects;

create policy "open receipts read"   on storage.objects for select using (bucket_id = 'receipts');
create policy "open receipts write"  on storage.objects for insert with check (bucket_id = 'receipts');
create policy "open receipts update" on storage.objects for update using (bucket_id = 'receipts') with check (bucket_id = 'receipts');
create policy "open receipts delete" on storage.objects for delete using (bucket_id = 'receipts');
