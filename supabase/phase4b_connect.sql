-- folio Phase 4b: profile picture, link details with QR codes, and image storage.
--
-- Run after phase4_help.sql (SQL Editor -> New query -> paste -> Run). Safe to run again.

-- Profile picture (empty = the built-in placeholder).
alter table public.profile add column if not exists avatar_url text not null default ''
  check (avatar_url = '' or avatar_url ~* '^https://');

-- What a visitor sees after clicking a platform in "Connect with me".
alter table public.platforms add column if not exists handle text not null default ''
  check (char_length(handle) <= 60);
alter table public.platforms add column if not exists note text not null default ''
  check (char_length(note) <= 200);
-- none: no QR · generated: made from the link · image: an uploaded QR picture
alter table public.platforms add column if not exists qr text not null default 'none'
  check (qr in ('none', 'generated', 'image'));
alter table public.platforms add column if not exists qr_image text not null default ''
  check (qr_image = '' or qr_image ~* '^https://');

-- ---------------------------------------------------------------------------
-- Image storage: public to read, only admins upload or delete
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
