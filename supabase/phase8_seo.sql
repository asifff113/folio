-- folio Phase 8: SEO & sharing settings.
--
-- Run after the earlier files (SQL Editor -> New query -> paste -> Run). Safe to run again.
-- One JSON column on the profile row; the site fills in defaults for anything missing.

alter table public.profile add column if not exists seo jsonb not null default '{}'::jsonb;
