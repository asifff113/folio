-- folio Phase 7: customization (look, 3D & motion, journey).
--
-- Run after the earlier files (SQL Editor -> New query -> paste -> Run). Safe to run again.
-- Each setting group is one JSON column on the profile row; the site fills in
-- defaults for anything missing, so empty objects are fine.

alter table public.profile add column if not exists look jsonb not null default '{}'::jsonb;
alter table public.profile add column if not exists scene jsonb not null default '{}'::jsonb;
alter table public.profile add column if not exists journey jsonb not null default '{}'::jsonb;
