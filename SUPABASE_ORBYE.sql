-- OrbyE cloud tables (SQL Editor en Supabase)
create table if not exists veltx_videos (
  id text primary key,
  type text default 'video',
  url text not null,
  title text,
  user_name text,
  likes int default 0,
  created_at timestamptz default now()
);
alter table veltx_videos enable row level security;
create policy "veltx read" on veltx_videos for select using (true);
create policy "veltx insert" on veltx_videos for insert with check (true);
create policy "veltx update" on veltx_videos for update using (true);

create table if not exists call_rooms (
  code text primary key,
  host text,
  created_at timestamptz default now()
);
alter table call_rooms enable row level security;
create policy "calls all" on call_rooms for all using (true) with check (true);

-- Storage: crea bucket público "veltx" en Storage → New bucket → public
