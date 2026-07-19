-- MORA portfolio schema. Apply this migration through the Supabase CLI or SQL editor.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  handle text not null,
  name text,
  headline text,
  bio text,
  avatar_url text,
  goal text,
  theme text not null default 'default',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (
    handle = lower(handle)
    and handle ~ '^[a-z0-9][a-z0-9_-]{2,29}$'
  )
);

-- A case-insensitive unique index prevents duplicate public URLs such as
-- /mora and /MORA, while the check constraint stores handles consistently.
create unique index profiles_handle_unique on public.profiles (lower(handle));
create index profiles_published_index on public.profiles (is_published) where is_published;

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  description text,
  evidence_text text,
  image_url text,
  external_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index portfolio_items_profile_sort_index
  on public.portfolio_items (profile_id, sort_order, created_at);

create table public.portfolio_blueprints (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  blueprint_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index portfolio_blueprints_profile_index on public.portfolio_blueprints (profile_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger portfolio_blueprints_set_updated_at
before update on public.portfolio_blueprints
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.portfolio_blueprints enable row level security;

-- Roles can only perform operations that the policies below allow.
grant select on public.profiles, public.portfolio_items, public.portfolio_blueprints to anon;
grant select, insert, update, delete on public.profiles, public.portfolio_items, public.portfolio_blueprints to authenticated;

-- Authenticated users may manage only the profile linked to their auth user.
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own profile"
on public.profiles for delete to authenticated
using ((select auth.uid()) = user_id);

-- Visitors can see only published profiles.
create policy "Visitors can read published profiles"
on public.profiles for select to anon
using (is_published = true);

-- The profile owner is derived from auth.users through profiles, never from
-- a caller-provided user ID on the child records.
create policy "Users can read their own portfolio items"
on public.portfolio_items for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_items.profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Users can create portfolio items for their profile"
on public.portfolio_items for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_items.profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Users can update their own portfolio items"
on public.portfolio_items for update to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_items.profile_id
      and profiles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_items.profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Users can delete their own portfolio items"
on public.portfolio_items for delete to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_items.profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Visitors can read published portfolio items"
on public.portfolio_items for select to anon
using (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_items.profile_id
      and profiles.is_published = true
  )
);

create policy "Users can read their own blueprints"
on public.portfolio_blueprints for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_blueprints.profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Users can create blueprints for their profile"
on public.portfolio_blueprints for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_blueprints.profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Users can update their own blueprints"
on public.portfolio_blueprints for update to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_blueprints.profile_id
      and profiles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_blueprints.profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Users can delete their own blueprints"
on public.portfolio_blueprints for delete to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_blueprints.profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Visitors can read published blueprints"
on public.portfolio_blueprints for select to anon
using (
  exists (
    select 1 from public.profiles
    where profiles.id = portfolio_blueprints.profile_id
      and profiles.is_published = true
  )
);
