-- folio Phase 4: "Ready to help me?" items and the admin inbox.
--
-- Run after schema.sql (SQL Editor -> New query -> paste -> Run). Safe to run again.
--
-- Access rules
--   * Anyone can read visible help items; admins read and change all of them.
--   * Nobody can read the inbox except admins.
--   * Visitors never write to the inbox directly: they call submit_help_response(),
--     which checks the item, the limits and the rate limit before inserting.

-- Help chapter settings live on the profile row (heading, intro, switches).
alter table public.profile add column if not exists help jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Help items: things you need help with and things you can provide
-- ---------------------------------------------------------------------------

create table if not exists public.help_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('need', 'offer')),
  title text not null check (char_length(title) between 1 and 80),
  details text not null default '' check (char_length(details) <= 600),
  tags text[] not null default '{}' check (cardinality(tags) <= 6),
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'solved')),
  visible boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.help_items enable row level security;

grant select on public.help_items to anon, authenticated;
grant insert, update, delete on public.help_items to authenticated;

-- Visitors (anon) may not call is_admin(), so their rule must not mention it.
drop policy if exists "public read visible" on public.help_items;
drop policy if exists "visitors read visible" on public.help_items;
create policy "visitors read visible" on public.help_items
  for select to anon
  using (visible);
drop policy if exists "signed-in read" on public.help_items;
create policy "signed-in read" on public.help_items
  for select to authenticated
  using (visible or (select public.is_admin()));
drop policy if exists "admin insert" on public.help_items;
create policy "admin insert" on public.help_items
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin update" on public.help_items;
create policy "admin update" on public.help_items
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin delete" on public.help_items;
create policy "admin delete" on public.help_items
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Inbox: notes visitors send about a help item
-- ---------------------------------------------------------------------------

create table if not exists public.inbox (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.help_items (id) on delete set null,
  -- Copied from the item when the note arrives, so it still reads well if the item changes or is deleted.
  item_kind text not null check (item_kind in ('need', 'offer')),
  item_title text not null,
  name text not null check (char_length(name) between 1 and 40),
  platform text not null check (platform in ('discord', 'telegram', 'instagram', 'email', 'other')),
  contact text not null check (char_length(contact) between 1 and 120),
  note text not null check (char_length(note) between 1 and 800),
  -- Where the visitor came from (instagram, google, direct, ...), detected in the browser.
  source text not null default 'direct' check (char_length(source) <= 40),
  -- Hash of the visitor's network address, only used for the rate limit.
  fingerprint text not null check (char_length(fingerprint) <= 64),
  is_read boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists inbox_created_at on public.inbox (created_at desc);
create index if not exists inbox_fingerprint on public.inbox (fingerprint, created_at desc);

alter table public.inbox enable row level security;

grant select, update, delete on public.inbox to authenticated;

drop policy if exists "admin read" on public.inbox;
create policy "admin read" on public.inbox
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "admin update" on public.inbox;
create policy "admin update" on public.inbox
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin delete" on public.inbox;
create policy "admin delete" on public.inbox
  for delete to authenticated using ((select public.is_admin()));

-- The only way in for visitors. Raises a short error code the site turns into a message:
--   closed, not_found, solved, invalid, rate_limited, busy
create or replace function public.submit_help_response(
  p_item uuid,
  p_name text,
  p_platform text,
  p_contact text,
  p_note text,
  p_source text,
  p_fingerprint text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.help_items%rowtype;
  v_accept boolean;
  v_name text := btrim(coalesce(p_name, ''));
  v_contact text := btrim(coalesce(p_contact, ''));
  v_note text := btrim(coalesce(p_note, ''));
  v_source text := left(lower(btrim(coalesce(p_source, 'direct'))), 40);
begin
  select coalesce((help ->> 'accept')::boolean, true) into v_accept from public.profile where id = 1;
  if not coalesce(v_accept, true) then
    raise exception 'closed';
  end if;

  select * into v_item from public.help_items where id = p_item and visible;
  if not found then
    raise exception 'not_found';
  end if;
  if v_item.status = 'solved' then
    raise exception 'solved';
  end if;

  if char_length(v_name) not between 1 and 40
    or char_length(v_contact) not between 1 and 120
    or char_length(v_note) not between 1 and 800
    or p_platform not in ('discord', 'telegram', 'instagram', 'email', 'other')
    or p_fingerprint is null or char_length(p_fingerprint) not between 16 and 64 then
    raise exception 'invalid';
  end if;

  -- At most 3 notes per visitor per hour, and 60 from everyone per hour.
  if (select count(*) from public.inbox
      where fingerprint = p_fingerprint and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.inbox where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'busy';
  end if;

  insert into public.inbox (item_id, item_kind, item_title, name, platform, contact, note, source, fingerprint)
  values (v_item.id, v_item.kind, v_item.title, v_name, p_platform, v_contact, v_note,
          coalesce(nullif(v_source, ''), 'direct'), p_fingerprint);
end;
$$;

revoke all on function public.submit_help_response(uuid, text, text, text, text, text, text) from public;
grant execute on function public.submit_help_response(uuid, text, text, text, text, text, text) to anon, authenticated;
