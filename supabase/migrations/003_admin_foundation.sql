-- Admin dashboard foundation: an is_admin flag, and real tables for the
-- transit data that today lives only in src/data/db.js / src/data/terminals.js
-- (stops, routes, route_stops, walk_links, terminals). Run once in the
-- Supabase SQL Editor. Safe to re-run — IF NOT EXISTS / OR REPLACE / ON
-- CONFLICT DO NOTHING throughout.
--
-- After running this, flag your own account as admin (replace the email):
--   update public.profiles set is_admin = true where email = 'you@example.com';

-- ===================== profiles: is_admin =====================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- security definer so RLS policies below can check *any* row's is_admin
-- without needing a policy that lets everyone read everyone's profile —
-- the function runs with the privileges of its owner, not the caller.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Admins can additionally read every profile / every saved_trips row (their
-- existing "own row only" policies stay in place — Postgres OR's policies
-- of the same command together) — this is what lets the dashboard's
-- Total Users / Total Trips counts run through the normal client (anon key
-- + session) instead of ever needing a service-role key in the browser.
drop policy if exists "profiles: admin read all" on public.profiles;
create policy "profiles: admin read all" on public.profiles
  for select using (public.is_admin());

drop policy if exists "saved_trips: admin read all" on public.saved_trips;
create policy "saved_trips: admin read all" on public.saved_trips
  for select using (public.is_admin());

-- ===================== stops =====================

create table if not exists public.stops (
  id text primary key,
  name text not null,
  type text not null default 'landmark',
  lat double precision not null,
  lon double precision not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stops enable row level security;
grant select on public.stops to anon, authenticated;
grant insert, update, delete on public.stops to authenticated;

drop policy if exists "stops: public read" on public.stops;
create policy "stops: public read" on public.stops for select using (true);

drop policy if exists "stops: admin write" on public.stops;
create policy "stops: admin write" on public.stops
  for all using (public.is_admin()) with check (public.is_admin());

-- ===================== routes =====================
-- One row per physical direction (matches today's data/db.js — "04L" has
-- two rows, one per direction). `direction` is an auto-generated display
-- label (stop names joined by " → "), not hand-typed, so it can't drift
-- from the actual stop sequence in route_stops.

create table if not exists public.routes (
  id text primary key,
  code text not null,
  type text not null default 'jeepney',
  direction text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.routes enable row level security;
grant select on public.routes to anon, authenticated;
grant insert, update, delete on public.routes to authenticated;

drop policy if exists "routes: public read" on public.routes;
create policy "routes: public read" on public.routes for select using (true);

drop policy if exists "routes: admin write" on public.routes;
create policy "routes: admin write" on public.routes
  for all using (public.is_admin()) with check (public.is_admin());

-- ===================== route_stops =====================

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id text not null references public.routes(id) on delete cascade,
  stop_id text not null references public.stops(id) on delete cascade,
  stop_order integer not null,
  unique (route_id, stop_order)
);

alter table public.route_stops enable row level security;
grant select on public.route_stops to anon, authenticated;
grant insert, update, delete on public.route_stops to authenticated;

drop policy if exists "route_stops: public read" on public.route_stops;
create policy "route_stops: public read" on public.route_stops for select using (true);

drop policy if exists "route_stops: admin write" on public.route_stops;
create policy "route_stops: admin write" on public.route_stops
  for all using (public.is_admin()) with check (public.is_admin());

create index if not exists route_stops_route_idx on public.route_stops (route_id, stop_order);

-- ===================== walk_links =====================
-- Short, unfarebox walking connections (see data/db.js's walkLinks) — a
-- handful of rows, stored undirected (routing.js builds both directions).

create table if not exists public.walk_links (
  id uuid primary key default gen_random_uuid(),
  stop_a_id text not null references public.stops(id) on delete cascade,
  stop_b_id text not null references public.stops(id) on delete cascade,
  minutes integer not null check (minutes > 0),
  status text not null default 'active' check (status in ('active', 'inactive'))
);

alter table public.walk_links enable row level security;
grant select on public.walk_links to anon, authenticated;
grant insert, update, delete on public.walk_links to authenticated;

drop policy if exists "walk_links: public read" on public.walk_links;
create policy "walk_links: public read" on public.walk_links for select using (true);

drop policy if exists "walk_links: admin write" on public.walk_links;
create policy "walk_links: admin write" on public.walk_links
  for all using (public.is_admin()) with check (public.is_admin());

-- ===================== terminals =====================

create table if not exists public.terminals (
  id text primary key,
  name text not null,
  location text not null,
  stop_id text references public.stops(id) on delete set null,
  lat double precision not null,
  lon double precision not null,
  routes text[] not null default '{}',
  hours_first text,
  hours_last text,
  hours_sourced boolean not null default false,
  hours_note text,
  long_route boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.terminals enable row level security;
grant select on public.terminals to anon, authenticated;
grant insert, update, delete on public.terminals to authenticated;

drop policy if exists "terminals: public read" on public.terminals;
create policy "terminals: public read" on public.terminals for select using (true);

drop policy if exists "terminals: admin write" on public.terminals;
create policy "terminals: admin write" on public.terminals
  for all using (public.is_admin()) with check (public.is_admin());

-- ===================== seed: current hardcoded data =====================
-- Mirrors src/data/db.js and src/data/terminals.js exactly, using the same
-- ids, so the live app behaves identically to today the moment this runs.

insert into public.stops (id, name, type, lat, lon) values
  ('it-park', 'IT Park Cebu', 'business', 10.3298, 123.9057),
  ('sm-city', 'SM City Cebu', 'mall', 10.3111, 123.9186),
  ('ayala', 'Ayala Center Cebu', 'mall', 10.3181, 123.9056),
  ('colon', 'Colon Street', 'landmark', 10.2938, 123.9016),
  ('basilica', 'Basilica del Santo Niño', 'landmark', 10.2938, 123.9022),
  ('fuente', 'Fuente Osmeña Circle', 'landmark', 10.3103, 123.8925),
  ('carbon', 'Carbon Market', 'landmark', 10.2939, 123.8998),
  ('talamban', 'Talamban', 'district', 10.3654, 123.8917),
  ('liloan', 'Liloan Public Market', 'landmark', 10.42195, 123.99573)
on conflict (id) do nothing;

insert into public.routes (id, code, type, direction) values
  ('04l-itpark-sm', '04L', 'jeepney', 'IT Park Cebu → Ayala Center Cebu → SM City Cebu'),
  ('04l-sm-itpark', '04L', 'jeepney', 'SM City Cebu → Ayala Center Cebu → IT Park Cebu'),
  ('17b-itpark-carbon', '17B', 'jeepney', 'IT Park Cebu (Apas) → Fuente Osmeña Circle → Carbon Market'),
  ('17b-carbon-itpark', '17B', 'jeepney', 'Carbon Market → Fuente Osmeña Circle → IT Park Cebu (Apas)'),
  ('14d-ayala-colon', '14D', 'jeepney', 'Ayala Center Cebu / Capitol → Colon Street'),
  ('14d-colon-ayala', '14D', 'jeepney', 'Colon Street → Ayala Center Cebu / Capitol'),
  ('13c-talamban-colon', '13C', 'jeepney', 'Talamban → Ayala Center Cebu → Colon Street'),
  ('13c-colon-talamban', '13C', 'jeepney', 'Colon Street → Ayala Center Cebu → Talamban'),
  ('25-liloan-sm', '25', 'jeepney', 'Liloan → Consolacion → Mandaue → North Bus Terminal → SM City Cebu'),
  ('25-sm-liloan', '25', 'jeepney', 'SM City Cebu → North Bus Terminal → Mandaue → Consolacion → Liloan')
on conflict (id) do nothing;

insert into public.route_stops (route_id, stop_id, stop_order) values
  ('04l-itpark-sm', 'it-park', 0), ('04l-itpark-sm', 'ayala', 1), ('04l-itpark-sm', 'sm-city', 2),
  ('04l-sm-itpark', 'sm-city', 0), ('04l-sm-itpark', 'ayala', 1), ('04l-sm-itpark', 'it-park', 2),
  ('17b-itpark-carbon', 'it-park', 0), ('17b-itpark-carbon', 'fuente', 1), ('17b-itpark-carbon', 'carbon', 2),
  ('17b-carbon-itpark', 'carbon', 0), ('17b-carbon-itpark', 'fuente', 1), ('17b-carbon-itpark', 'it-park', 2),
  ('14d-ayala-colon', 'ayala', 0), ('14d-ayala-colon', 'colon', 1),
  ('14d-colon-ayala', 'colon', 0), ('14d-colon-ayala', 'ayala', 1),
  ('13c-talamban-colon', 'talamban', 0), ('13c-talamban-colon', 'ayala', 1), ('13c-talamban-colon', 'colon', 2),
  ('13c-colon-talamban', 'colon', 0), ('13c-colon-talamban', 'ayala', 1), ('13c-colon-talamban', 'talamban', 2),
  ('25-liloan-sm', 'liloan', 0), ('25-liloan-sm', 'sm-city', 1),
  ('25-sm-liloan', 'sm-city', 0), ('25-sm-liloan', 'liloan', 1)
on conflict (route_id, stop_order) do nothing;

insert into public.walk_links (stop_a_id, stop_b_id, minutes) values
  ('carbon', 'colon', 5),
  ('colon', 'basilica', 8)
on conflict do nothing;

insert into public.terminals (id, name, location, stop_id, lat, lon, routes, hours_first, hours_last, hours_sourced, hours_note, long_route) values
  ('it-park-terminal', 'IT Park Terminal', 'Cebu IT Park, Lahug, Cebu City', 'it-park', 10.3298, 123.9057, array['04L','17B','MyBus (city bus)'], '4:00 AM', '9:50 PM', true, null, false),
  ('sm-city-terminal', 'SM City Cebu Terminal', 'North Reclamation Area, Cebu City', 'sm-city', 10.3111, 123.9186, array['04L','MyBus (city bus)'], '6:00 AM', '9:00 PM', true, 'MyBus hours; other jeepney lines may run later', false),
  ('parkmall-terminal', 'Parkmall Terminal', 'Ouano Ave, Mandaue Reclamation Area, Mandaue City', null, 10.332, 123.943, array['25 (Liloan)','24 (Consolacion)','01K (Urgello)','20A (Ayala–Mandaue)'], '5:00 AM', '9:00 PM', false, null, false),
  ('ayala-terminal', 'Ayala Center Cebu', 'Cebu Business Park, Cebu City', 'ayala', 10.3181, 123.9056, array['04L','14D','13C'], '5:00 AM', '10:00 PM', false, null, false),
  ('south-bus-terminal', 'Cebu South Bus Terminal', 'N. Bacalso Ave, Cebu City', null, 10.286, 123.887, array['Bato via Barili (Moalboal, Badian/Kawasan Falls)','Bato via Oslob (Oslob, Santander)'], '1:00 AM', '11:00 PM', true, 'Near round-the-clock; Oslob buses depart every ~30 min', true),
  ('north-bus-terminal', 'Cebu North Bus Terminal', 'North Reclamation Area, Cebu City (beside SM City Cebu)', null, 10.3125, 123.9175, array['Maya, Daanbantayan (for Malapascua Island)','Hagnaya, San Remigio (for Bantayan Island)'], '3:00 AM', '6:00 PM', true, 'For Bantayan Island, leave by ~1:00 PM to catch the last Hagnaya ferry', true),
  ('mactan-airport-terminal', 'Mactan-Cebu Int''l Airport (MyBus)', 'Lapu-Lapu City, Mactan Island', null, 10.3075, 123.9789, array['MyBus: Airport → SM City Cebu → Ayala Center Cebu → IT Park Cebu'], '6:40 AM', '8:40 PM', true, 'MyBus only, via Marcelo Fernan Bridge; return trip (IT Park → Airport) runs 7:00 AM-10:00 PM', true)
on conflict (id) do nothing;
