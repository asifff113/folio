-- folio database schema (Phase 3: profile, links, sections, theme)
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again: tables are created only if missing and the seed
-- rows are inserted only if missing.
--
-- Access rules
--   * Anyone can read the public content (that is what the site shows).
--   * Only users listed in public.admins can change it.
--   * After creating your admin user (Authentication -> Users -> Add user),
--     make it an admin with the last statement in this file.

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "admins can see themselves" on public.admins;
create policy "admins can see themselves" on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- True when the signed-in user is an admin. Security definer so policies can
-- call it without granting read access to the admins table.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Content tables
-- ---------------------------------------------------------------------------

-- Single row (id = 1) with the profile and theme.
create table if not exists public.profile (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'NAME' check (char_length(name) between 1 and 40),
  handle text not null default 'your_name' check (char_length(handle) between 1 and 32),
  tagline text not null default '' check (char_length(tagline) <= 140),
  about_heading text not null default '' check (char_length(about_heading) <= 120),
  about_body text not null default '' check (char_length(about_body) <= 1200),
  interests_heading text not null default '' check (char_length(interests_heading) <= 120),
  interests_tags text[] not null default '{}' check (cardinality(interests_tags) <= 24),
  theme jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.platforms (
  id text primary key check (id ~ '^[a-z0-9_-]{1,32}$'),
  label text not null check (char_length(label) between 1 and 32),
  url text not null default '' check (url = '' or url ~* '^(https?://|mailto:)'),
  color text not null default '#2fe3ff' check (color ~* '^#[0-9a-f]{6}$'),
  visible boolean not null default true,
  sort integer not null default 0
);

-- Optional sections. Each enabled one becomes a chapter of the journey (Phase 5).
create table if not exists public.sections (
  key text primary key check (key ~ '^[a-z0-9_-]{1,32}$'),
  title text not null check (char_length(title) between 1 and 40),
  enabled boolean not null default false,
  sort integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Row level security: public read, admin write
-- ---------------------------------------------------------------------------

alter table public.profile enable row level security;
alter table public.platforms enable row level security;
alter table public.sections enable row level security;

-- Table privileges for the API roles (row level security still applies on top).
grant select on public.profile, public.platforms, public.sections to anon, authenticated;
grant insert, update, delete on public.profile, public.platforms, public.sections to authenticated;
grant select on public.admins to authenticated;

do $$
declare t text;
begin
  foreach t in array array['profile', 'platforms', 'sections'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "admin insert" on public.%I', t);
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check ((select public.is_admin()))', t);
    execute format('drop policy if exists "admin update" on public.%I', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('drop policy if exists "admin delete" on public.%I', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Seed (placeholders, edited from the admin panel)
-- ---------------------------------------------------------------------------

insert into public.profile (id, name, handle, tagline, about_heading, about_body, interests_heading, interests_tags, theme)
values (
  1,
  'NAME',
  'your_name',
  'one-line intro, set in the admin panel',
  'A short line about who you are.',
  'This paragraph is written in the admin panel. Two or three sentences is plenty.',
  'Things I''m into right now.',
  array['ai', 'music', 'photography', 'open source', 'gaming', 'design'],
  '{"primary": "#2fe3ff", "secondary": "#ff4fd8", "scanlines": true}'::jsonb
)
on conflict (id) do nothing;

insert into public.platforms (id, label, url, color, visible, sort) values
  ('discord', 'Discord', '', '#5865f2', true, 0),
  ('telegram', 'Telegram', '', '#2aabee', true, 1),
  ('instagram', 'Instagram', '', '#e1306c', true, 2),
  ('github', 'GitHub', '', '#d0d7de', true, 3),
  ('linkedin', 'LinkedIn', '', '#3d8fe0', true, 4),
  ('x', 'X', '', '#f2f2f2', true, 5)
on conflict (id) do nothing;

insert into public.sections (key, title, enabled, sort) values
  ('now', 'Now', false, 0),
  ('skills', 'Skills', false, 1),
  ('projects', 'Projects', false, 2),
  ('research', 'Research papers', false, 3),
  ('gallery', 'Gallery', false, 4),
  ('certificates', 'Certificates', false, 5),
  ('experience', 'Experience', false, 6),
  ('education', 'Education', false, 7),
  ('achievements', 'Achievements', false, 8),
  ('blog', 'Blog', false, 9),
  ('testimonials', 'Testimonials', false, 10),
  ('resume', 'Resume', false, 11),
  ('music', 'Music', false, 12),
  ('contact', 'Contact form', false, 13)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Make your user an admin (replace the email, then run just this statement)
-- ---------------------------------------------------------------------------

-- insert into public.admins (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict do nothing;
