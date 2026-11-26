-- folio Phase 9: visitor counting.
--
-- Run after the earlier files (SQL Editor -> New query -> paste -> Run). Safe to run again.
--
-- Privacy: no cookies, no IP addresses. The site sends a hash of the visitor's
-- address and browser; it is mixed with a random salt that changes every day
-- and is then thrown away, so the same person counts once a day and visits
-- can't be linked across days or traced back to anyone.

alter table public.profile add column if not exists visitors jsonb not null default '{}'::jsonb;

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  day date not null default ((now() at time zone 'utc')::date),
  visitor text not null,
  country text not null default '' check (country ~ '^([A-Z]{2})?$'),
  source text not null default 'direct' check (source ~ '^[a-z0-9._-]{1,40}$'),
  device text not null default 'desktop' check (device in ('phone', 'tablet', 'desktop')),
  -- Chapters this visit scrolled to (BOOT, ABOUT, S:projects, ...).
  reached text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists visits_day_idx on public.visits (day);
create index if not exists visits_last_seen_idx on public.visits (last_seen);

-- Nobody reads or writes the table directly; only the functions below.
alter table public.visits enable row level security;

create table if not exists public.visit_salt (
  day date primary key,
  salt text not null
);
alter table public.visit_salt enable row level security;

-- ---------------------------------------------------------------------------
-- The public counter, or null while it is switched off.
-- ---------------------------------------------------------------------------

create or replace function public.visit_counter()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings jsonb;
  v_kind text;
begin
  select visitors into v_settings from public.profile where id = 1;
  if not coalesce((v_settings ->> 'counter')::boolean, false) then
    return null;
  end if;
  v_kind := case when v_settings ->> 'counterKind' = 'visits' then 'visits' else 'people' end;
  return jsonb_build_object(
    'kind', v_kind,
    'value', case when v_kind = 'visits'
      then (select count(*) from public.visits)
      else (select count(*) from (select distinct day, visitor from public.visits) d) end);
end;
$$;

revoke all on function public.visit_counter() from public;
grant execute on function public.visit_counter() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- A new visit. p_hash is the site's hash of address + browser (never the
-- address itself). Returns {id, counter}.
-- ---------------------------------------------------------------------------

create or replace function public.record_visit(
  p_hash text,
  p_country text,
  p_source text,
  p_device text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_salt text;
  v_visitor text;
  v_id uuid;
begin
  if p_hash is null or p_hash !~ '^[a-f0-9]{32,64}$'
    or coalesce(p_country, '') !~ '^([A-Z]{2})?$'
    or coalesce(p_source, '') !~ '^[a-z0-9._-]{1,40}$'
    or p_device not in ('phone', 'tablet', 'desktop') then
    raise exception 'invalid';
  end if;

  -- Today's salt; yesterday's is deleted so old hashes can't be matched again.
  delete from public.visit_salt where day < v_today;
  insert into public.visit_salt (day, salt)
  values (v_today, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  on conflict (day) do nothing;
  select salt into v_salt from public.visit_salt where day = v_today;

  v_visitor := left(encode(sha256(convert_to(v_salt || ':' || p_hash, 'UTF8')), 'hex'), 32);

  -- One person opening the site over and over adds at most 20 visits a day,
  -- and everyone together at most 3000 an hour.
  if (select count(*) from public.visits where day = v_today and visitor = v_visitor) >= 20
    or (select count(*) from public.visits where created_at > now() - interval '1 hour') >= 3000 then
    raise exception 'busy';
  end if;

  insert into public.visits (day, visitor, country, source, device)
  values (v_today, v_visitor, coalesce(p_country, ''), p_source, p_device)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'counter', public.visit_counter());
end;
$$;

revoke all on function public.record_visit(text, text, text, text) from public;
grant execute on function public.record_visit(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Still here: marks the visit as active and adds the chapters it reached.
-- Only for visits started in the last 12 hours. Returns the counter.
-- ---------------------------------------------------------------------------

create or replace function public.visit_seen(p_id uuid, p_reached text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits v
  set last_seen = now(),
      reached = (
        select coalesce(array_agg(distinct k), '{}') from (
          select unnest(v.reached) as k
          union
          select k from unnest(coalesce(p_reached, '{}')) as k
          where k ~ '^(BOOT|ABOUT|INTERESTS|SIGNAL|HELP|TRACES|END|S:[a-z0-9_-]{1,32})$'
          limit 60
        ) keys)
  where v.id = p_id and v.created_at > now() - interval '12 hours';
  return public.visit_counter();
end;
$$;

revoke all on function public.visit_seen(uuid, text[]) from public;
grant execute on function public.visit_seen(uuid, text[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: everything the Visitors page shows, for the last p_days days
-- (0 = all time, by month).
-- ---------------------------------------------------------------------------

create or replace function public.visitor_stats(p_days int)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_since date;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  v_since := case when p_days > 0 then v_today - (least(p_days, 366) - 1) else '1970-01-01'::date end;

  with v as (select * from public.visits where day >= v_since),
  people as (select distinct day, visitor from v)
  select jsonb_build_object(
    'visitors', (select count(*) from people),
    'visits', (select count(*) from v),
    'phone', (select count(*) from v where device = 'phone'),
    'ended', (select count(*) from v where 'END' = any(reached)),
    'live', (select count(*) from public.visits where last_seen > now() - interval '2 minutes'),
    'series', case when p_days > 0 then (
        select coalesce(jsonb_agg(jsonb_build_array(d::date, (select count(*) from people p where p.day = d::date)) order by d), '[]')
        from generate_series(v_since, v_today, interval '1 day') d)
      else (
        select coalesce(jsonb_agg(jsonb_build_array(m, n) order by m), '[]')
        from (select to_char(day, 'YYYY-MM') as m, count(*) as n from people group by 1) months)
      end,
    'sources', (
        select coalesce(jsonb_agg(jsonb_build_array(source, n) order by n desc), '[]')
        from (select source, count(*) as n from v group by source order by n desc limit 8) s),
    'countries', (
        select coalesce(jsonb_agg(jsonb_build_array(country, n) order by n desc), '[]')
        from (select country, count(*) as n from v group by country order by n desc limit 8) c),
    'reached', (
        select coalesce(jsonb_object_agg(k, n), '{}')
        from (select k, count(*) as n from v, unnest(v.reached) as k group by k) r)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.visitor_stats(int) from public, anon;
grant execute on function public.visitor_stats(int) to authenticated;

-- Admin: start counting from zero.
create or replace function public.reset_visits()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  delete from public.visits where true;
end;
$$;

revoke all on function public.reset_visits() from public, anon;
grant execute on function public.reset_visits() to authenticated;
