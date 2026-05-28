create table if not exists mood_logs (
  id uuid primary key default gen_random_uuid(),
  athlete text not null check (athlete in ('MK','Xabi')),
  date date not null,
  mood text not null check (mood in (
    'happy','joyful','annoyed','worried','dizzy',
    'sad','angry','love','sleepy','neutral'
  )),
  note text,
  created_at timestamptz not null default now(),
  unique (athlete, date)
);

create index if not exists mood_logs_athlete_date_idx
  on mood_logs (athlete, date desc);

alter table mood_logs enable row level security;

drop policy if exists "open mood_logs" on mood_logs;
create policy "open mood_logs" on mood_logs for all using (true) with check (true);
