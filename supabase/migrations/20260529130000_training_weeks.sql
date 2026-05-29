create table if not exists training_weeks (
  id           uuid primary key default gen_random_uuid(),
  athlete      text not null check (athlete in ('MK','Xabi')),
  week         int  not null check (week between 1 and 23),
  version      int  not null default 1,
  status       text not null
                 check (status in ('draft','confirmed','superseded'))
                 default 'draft',
  plan_jsonb   jsonb not null,
  weekly_note  text,
  generated_by text not null
                 check (generated_by in ('claude','manual','seed'))
                 default 'claude',
  extra_prompt   text,
  source_summary jsonb,
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (athlete, week, version)
);

create index if not exists training_weeks_athlete_week_idx on training_weeks (athlete, week);
create index if not exists training_weeks_status_idx       on training_weeks (status, athlete, week);

alter table training_weeks enable row level security;

drop policy if exists "training_weeks_all" on training_weeks;
create policy "training_weeks_all" on training_weeks for all using (true) with check (true);

create table if not exists training_sources (
  id          text primary key,
  file_id     text not null,
  filename    text not null,
  description text,
  uploaded_at timestamptz not null default now()
);

alter table training_sources enable row level security;

drop policy if exists "training_sources_all" on training_sources;
create policy "training_sources_all" on training_sources for all using (true) with check (true);
