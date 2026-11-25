-- folio Phase 5: real visitor traces (signatures on the wall).
--
-- Run after the earlier files (SQL Editor -> New query -> paste -> Run). Safe to run again.
--
-- Access rules
--   * The traces table is private: only admins read or change it directly.
--   * Visitors read the wall through get_traces(), which returns only what the
--     page shows (name, note, signature, time). Platforms never leave the database
--     except to admins.
--   * Visitors add a trace through submit_trace(), which checks the limits and
--     the rate limit before inserting.
--   * New, approved, hidden and deleted traces are broadcast on the public
--     realtime topic "traces" (same public fields only), so open pages update live.

-- Traces settings live on the profile row: enabled, approval, allowMessage, wallLimit.
alter table public.profile add column if not exists traces jsonb not null default '{}'::jsonb;

create table if not exists public.traces (
  id uuid primary key default gen_random_uuid(),
  -- Optional; empty shows as "someone".
  name text not null default '' check (char_length(name) <= 24),
  -- Optional "say hi".
  message text not null default '' check (char_length(message) <= 60),
  -- Small PNG of the drawn signature.
  signature text not null check (
    char_length(signature) between 100 and 60000
    and signature ~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'
  ),
  -- Where the visitor says they found you (optional) and where the site detected they came from.
  platform text not null default '' check (char_length(platform) <= 24),
  detected text not null default 'direct' check (char_length(detected) <= 40),
  status text not null default 'live' check (status in ('live', 'pending', 'hidden')),
  -- Hash of the visitor's network address, only used for the rate limit.
  fingerprint text not null check (char_length(fingerprint) <= 64),
  created_at timestamptz not null default now()
);

create index if not exists traces_created_at on public.traces (created_at desc);
create index if not exists traces_live on public.traces (created_at desc) where status = 'live';
create index if not exists traces_fingerprint on public.traces (fingerprint, created_at desc);

alter table public.traces enable row level security;

revoke all on public.traces from anon;
grant select, update, delete on public.traces to authenticated;

drop policy if exists "admin read" on public.traces;
create policy "admin read" on public.traces
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "admin update" on public.traces;
create policy "admin update" on public.traces
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin delete" on public.traces;
create policy "admin delete" on public.traces
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- The wall, for visitors: newest live traces, public fields only.
-- Signatures are only sent for the newest few (the log); the rest are stars.
-- ---------------------------------------------------------------------------

create or replace function public.get_traces()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with settings as (
    select
      coalesce((traces ->> 'enabled')::boolean, true) as enabled,
      least(greatest(coalesce((traces ->> 'wallLimit')::int, 300), 10), 1000) as wall_limit
    from public.profile where id = 1
  ),
  wall as (
    select t.id, t.name, t.message, t.signature, t.created_at,
           row_number() over (order by t.created_at desc) as rn
    from public.traces t
    where t.status = 'live'
    order by t.created_at desc
    limit (select coalesce((select wall_limit from settings), 300))
  )
  select case when coalesce((select enabled from settings), true) then
    jsonb_build_object(
      'total', (select count(*) from public.traces where status = 'live'),
      'traces', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', w.id,
          'name', w.name,
          'message', w.message,
          'signature', case when w.rn <= 6 then w.signature end,
          'created_at', w.created_at
        ) order by w.created_at desc)
        from wall w
      ), '[]'::jsonb)
    )
  else jsonb_build_object('total', 0, 'traces', '[]'::jsonb) end;
$$;

revoke all on function public.get_traces() from public;
grant execute on function public.get_traces() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The only way in for visitors. Returns {id, status, created_at}.
-- Raises a short error code the site turns into a message:
--   closed, invalid, rate_limited, busy
-- ---------------------------------------------------------------------------

create or replace function public.submit_trace(
  p_name text,
  p_message text,
  p_signature text,
  p_platform text,
  p_detected text,
  p_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings jsonb;
  v_name text := btrim(coalesce(p_name, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_platform text := left(lower(btrim(coalesce(p_platform, ''))), 24);
  v_detected text := left(lower(btrim(coalesce(p_detected, ''))), 40);
  v_status text;
  v_row public.traces%rowtype;
begin
  select traces into v_settings from public.profile where id = 1;
  if not coalesce((v_settings ->> 'enabled')::boolean, true) then
    raise exception 'closed';
  end if;
  if not coalesce((v_settings ->> 'allowMessage')::boolean, true) then
    v_message := '';
  end if;

  if char_length(v_name) > 24
    or char_length(v_message) > 60
    or v_platform !~ '^[a-z0-9._-]*$'
    or v_detected !~ '^[a-z0-9._-]*$'
    or p_signature is null
    or char_length(p_signature) not between 100 and 60000
    or p_signature !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'
    or p_fingerprint is null or char_length(p_fingerprint) not between 16 and 64 then
    raise exception 'invalid';
  end if;

  -- One trace per visitor per hour, and 60 from everyone per hour.
  if exists (select 1 from public.traces
             where fingerprint = p_fingerprint and created_at > now() - interval '1 hour') then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.traces where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'busy';
  end if;

  v_status := case when coalesce((v_settings ->> 'approval')::boolean, false) then 'pending' else 'live' end;

  insert into public.traces (name, message, signature, platform, detected, status, fingerprint)
  values (v_name, v_message, p_signature, v_platform, coalesce(nullif(v_detected, ''), 'direct'), v_status, p_fingerprint)
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'status', v_row.status, 'created_at', v_row.created_at);
end;
$$;

revoke all on function public.submit_trace(text, text, text, text, text, text) from public;
grant execute on function public.submit_trace(text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Live updates: tell open pages when a trace joins or leaves the wall.
-- Only the public fields are sent.
-- ---------------------------------------------------------------------------

create or replace function public.broadcast_trace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_live boolean := tg_op in ('UPDATE', 'DELETE') and old.status = 'live';
  is_live boolean := tg_op in ('INSERT', 'UPDATE') and new.status = 'live';
begin
  if is_live and not was_live then
    perform realtime.send(
      jsonb_build_object('id', new.id, 'name', new.name, 'message', new.message,
                         'signature', new.signature, 'created_at', new.created_at),
      'add', 'traces', false);
  elsif was_live and not is_live then
    perform realtime.send(jsonb_build_object('id', old.id), 'remove', 'traces', false);
  end if;
  return null;
end;
$$;

revoke all on function public.broadcast_trace() from public, anon, authenticated;

drop trigger if exists traces_broadcast on public.traces;
create trigger traces_broadcast
  after insert or update of status or delete on public.traces
  for each row execute function public.broadcast_trace();
