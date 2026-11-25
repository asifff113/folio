-- folio Phase 6: section layouts, section items, your own sections, resume PDF, contact form.
--
-- Run after the earlier files (SQL Editor -> New query -> paste -> Run). Safe to run again.
--
-- Access rules
--   * Anyone can read sections and visible section items; admins read and change everything.
--   * Contact form notes go to the private inbox through submit_contact(), never directly.
--   * The media bucket now also takes PDFs (the resume), up to 5 MB.

-- ---------------------------------------------------------------------------
-- Sections: a layout per section, an intro line, and your own (custom) sections
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'sections' and column_name = 'layout') then
    alter table public.sections add column layout text not null default 'cards'
      check (layout in ('cards', 'timeline', 'skills', 'gallery', 'text', 'links', 'file', 'form'));
    -- Built-in sections start with the layout that suits them (only the first time).
    update public.sections set layout = case key
      when 'now' then 'text'
      when 'skills' then 'skills'
      when 'gallery' then 'gallery'
      when 'experience' then 'timeline'
      when 'education' then 'timeline'
      when 'resume' then 'file'
      when 'music' then 'links'
      when 'contact' then 'form'
      else 'cards' end;
  end if;
end $$;

alter table public.sections add column if not exists intro text not null default '' check (char_length(intro) <= 240);
alter table public.sections add column if not exists custom boolean not null default false;

-- ---------------------------------------------------------------------------
-- Section items. One shape for every layout; each layout uses the fields it needs:
--   cards     image, title, date, body, details, tags, link 1 and 2
--   timeline  date, title (role), subtitle (place), body
--   skills    subtitle (group), title (skill), level 0-5
--   gallery   image, title (caption), body
--   text      title (heading), details (the text)
--   links     title, subtitle, link 1
--   file      title (button label), body (note), link 1 (the uploaded PDF)
-- ---------------------------------------------------------------------------

create table if not exists public.section_items (
  id uuid primary key default gen_random_uuid(),
  section_key text not null references public.sections (key) on delete cascade on update cascade,
  title text not null default '' check (char_length(title) <= 120),
  subtitle text not null default '' check (char_length(subtitle) <= 120),
  date_text text not null default '' check (char_length(date_text) <= 40),
  body text not null default '' check (char_length(body) <= 600),
  details text not null default '' check (char_length(details) <= 4000),
  image_url text not null default '' check (char_length(image_url) <= 400),
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  link1_label text not null default '' check (char_length(link1_label) <= 24),
  link1_url text not null default '' check (char_length(link1_url) <= 400),
  link2_label text not null default '' check (char_length(link2_label) <= 24),
  link2_url text not null default '' check (char_length(link2_url) <= 400),
  level smallint not null default 0 check (level between 0 and 5),
  visible boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists section_items_section on public.section_items (section_key, sort);

alter table public.section_items enable row level security;

grant select on public.section_items to anon, authenticated;
grant insert, update, delete on public.section_items to authenticated;

-- Visitors (anon) may not call is_admin(), so their rule must not mention it.
drop policy if exists "visitors read visible" on public.section_items;
create policy "visitors read visible" on public.section_items
  for select to anon using (visible);
drop policy if exists "signed-in read" on public.section_items;
create policy "signed-in read" on public.section_items
  for select to authenticated using (visible or (select public.is_admin()));
drop policy if exists "admin insert" on public.section_items;
create policy "admin insert" on public.section_items
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin update" on public.section_items;
create policy "admin update" on public.section_items
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin delete" on public.section_items;
create policy "admin delete" on public.section_items
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Contact form: notes land in the inbox as kind "contact"
-- ---------------------------------------------------------------------------

alter table public.inbox drop constraint if exists inbox_item_kind_check;
alter table public.inbox add constraint inbox_item_kind_check check (item_kind in ('need', 'offer', 'contact'));

-- Raises a short error code the site turns into a message: closed, invalid, rate_limited, busy
create or replace function public.submit_contact(
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
  v_name text := btrim(coalesce(p_name, ''));
  v_contact text := btrim(coalesce(p_contact, ''));
  v_note text := btrim(coalesce(p_note, ''));
  v_source text := left(lower(btrim(coalesce(p_source, 'direct'))), 40);
begin
  if not exists (select 1 from public.sections where key = 'contact' and enabled) then
    raise exception 'closed';
  end if;

  if char_length(v_name) not between 1 and 40
    or char_length(v_contact) not between 1 and 120
    or char_length(v_note) not between 1 and 800
    or p_platform not in ('discord', 'telegram', 'instagram', 'email', 'other')
    or p_fingerprint is null or char_length(p_fingerprint) not between 16 and 64 then
    raise exception 'invalid';
  end if;

  -- Shares the inbox limits with the help notes: 3 per visitor per hour, 60 in total.
  if (select count(*) from public.inbox
      where fingerprint = p_fingerprint and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.inbox where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'busy';
  end if;

  insert into public.inbox (item_id, item_kind, item_title, name, platform, contact, note, source, fingerprint)
  values (null, 'contact', 'Contact form', v_name, p_platform, v_contact, v_note,
          coalesce(nullif(v_source, ''), 'direct'), p_fingerprint);
end;
$$;

revoke all on function public.submit_contact(text, text, text, text, text, text) from public;
grant execute on function public.submit_contact(text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Uploads: section images (2 MB, checked by the site) and the resume PDF (5 MB)
-- ---------------------------------------------------------------------------

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
where id = 'media';
