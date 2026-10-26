-- OrbyE profiles (foto + banner) — pegar en SQL Editor
create table if not exists public.profiles (
  id text primary key,
  username text,
  email text,
  photo text,
  avatar text,
  banner text,
  bio text,
  verified boolean default false,
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_all" on public.profiles;
create policy "profiles_all" on public.profiles for all using (true) with check (true);

-- si usas valt_users, columnas extra:
alter table if exists public.valt_users add column if not exists photo text;
alter table if exists public.valt_users add column if not exists avatar text;
alter table if exists public.valt_users add column if not exists banner text;
alter table if exists public.valt_users add column if not exists bio text;
