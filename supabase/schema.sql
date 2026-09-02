-- TransitGo cloud data schema.
--
-- SETUP:
-- 1. Create a project at https://supabase.com (free tier is plenty for this).
-- 2. In the Supabase dashboard: SQL Editor -> New query -> paste this whole
--    file -> Run.
-- 3. In Project Settings -> API, copy "Project URL" and the "anon public"
--    key into your .env.local as VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
-- 4. In Authentication -> Providers, Email should already be enabled by
--    default — that's the only provider TransitGo's login screen uses.
--
-- Nothing here needs to be re-run after the first time; re-running is safe
-- (everything uses IF NOT EXISTS / OR REPLACE) if you need to reapply it.

-- ===================== profiles =====================
-- One row per signed-up user, extending Supabase's built-in auth.users.
-- full_name/account_type/phone_number/age/address_* are collected at
-- sign-up (see the registration form) and land here via handle_new_user()
-- reading auth.users.raw_user_meta_data — supabase.auth.signUp() is called
-- with that data in `options.data`, so the whole profile is populated
-- atomically in the same transaction as account creation; no separate
-- follow-up insert from the client.
--
-- email is duplicated from auth.users for convenient querying/display —
-- auth.users stays the source of truth for login; this copy is only ever
-- written at signup (there's no "change email" flow yet, so it can't drift).
--
-- rider_type is a *different* concept from account_type: rider_type is the
-- fare-discount category (regular/student/pwd/tourist) picked per search
-- and still lives in localStorage (src/data/riderTypes.js) — kept here only
-- as scaffolding if you later want that to follow the account too.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  account_type text not null check (account_type in ('student', 'regular')),
  phone_number text not null,
  age integer not null check (age > 0 and age <= 120),
  address_street text not null,
  address_barangay text,
  address_city text not null,
  address_province text not null,
  address_postal_code text,
  rider_type text not null default 'regular' check (rider_type in ('regular', 'student', 'pwd', 'tourist')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a fully-populated profiles row the moment someone signs up,
-- so the app never has to handle "logged in but no profile row yet".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, email, account_type, phone_number, age,
    address_street, address_barangay, address_city, address_province, address_postal_code
  ) values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'account_type',
    new.raw_user_meta_data ->> 'phone_number',
    nullif(new.raw_user_meta_data ->> 'age', '')::integer,
    new.raw_user_meta_data ->> 'address_street',
    nullif(new.raw_user_meta_data ->> 'address_barangay', ''),
    new.raw_user_meta_data ->> 'address_city',
    new.raw_user_meta_data ->> 'address_province',
    nullif(new.raw_user_meta_data ->> 'address_postal_code', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===================== saved_trips =====================
-- Replaces the localStorage "transitgo-saved-trips" array for logged-in
-- users. Guests (not signed in) keep using localStorage as before — see
-- src/hooks/useSavedTrips.js.
--
-- route/from_point/to_point are stored as JSONB rather than flattened
-- columns because a route can carry a variable-length `legs` array (for
-- multi-transfer trips) and from/to are full stop objects (id, name, lat,
-- lon) — flattening would lose exactly the data the journey timeline and
-- "reopen this saved trip" flow need to reconstruct the trip faithfully.
-- trip_key mirrors the app's original in-memory id ("routeId-fromId-toId")
-- and is what dedupes repeat saves of the same trip.

create table if not exists public.saved_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_key text not null,
  route jsonb not null,
  from_point jsonb not null,
  to_point jsonb not null,
  saved_at timestamptz not null default now(),
  unique (user_id, trip_key)
);

alter table public.saved_trips enable row level security;

drop policy if exists "saved_trips: all own" on public.saved_trips;
create policy "saved_trips: all own" on public.saved_trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===================== expenses =====================
-- Replaces the localStorage "transitgo-expenses" array for logged-in users.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null default now(),
  from_name text not null,
  to_name text not null,
  transport_type text not null default 'other',
  fare numeric not null default 0,
  note text,
  route_id text,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

drop policy if exists "expenses: all own" on public.expenses;
create policy "expenses: all own" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists expenses_user_date_idx on public.expenses (user_id, date desc);
