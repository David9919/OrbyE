-- OrbyE Supabase schema (pegar en SQL Editor de Supabase)
-- Proyecto: mhexliyacfgsclsnvqsp

create table if not exists public.profiles (
  email text primary key,
  username text,
  photo text,
  banner text,
  updated_at timestamptz default now()
);

create table if not exists public.veltx_videos (
  id text primary key,
  type text default 'video',
  url text,
  title text,
  user_name text,
  likes int default 0,
  created_at timestamptz default now()
);

create table if not exists public.onyx_posts (
  id text primary key,
  user_name text,
  text text,
  gif text,
  likes int default 0,
  created_at timestamptz default now()
);

-- Lectura pública (anon), escritura con anon key (demo)
alter table public.profiles enable row level security;
alter table public.veltx_videos enable row level security;
alter table public.onyx_posts enable row level security;

drop policy if exists "profiles_all" on public.profiles;
create policy "profiles_all" on public.profiles for all using (true) with check (true);

drop policy if exists "veltx_all" on public.veltx_videos;
create policy "veltx_all" on public.veltx_videos for all using (true) with check (true);

drop policy if exists "onyx_all" on public.onyx_posts;
create policy "onyx_all" on public.onyx_posts for all using (true) with check (true);

-- Storage bucket (opcional, para videos grandes)
-- En Dashboard → Storage → New bucket → nombre: veltx → Public
