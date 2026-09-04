-- Destinations (tourist attractions) as a real Supabase table, following the
-- exact same pattern as 003_admin_foundation.sql's stops/terminals: text
-- primary key, public read, admin-only write via public.is_admin(), a
-- hardcoded-seed mirror of src/data/attractions.js. Adds source-tracking
-- columns (source, source_url, verification_status, last_verified_at) —
-- currently only on this table, not retrofitted onto stops/routes/terminals
-- (out of scope here). updated_at is set by the client on every write, same
-- as every other table in this schema — there is no update trigger.
-- Safe to re-run — IF NOT EXISTS / OR REPLACE / ON CONFLICT DO NOTHING
-- throughout. Run once in the Supabase SQL Editor, same as 003.

create table if not exists public.destinations (
  id text primary key,
  name text not null,
  location text not null,
  description text not null default '',
  icon text not null default 'ti-map-pin',
  category text not null default 'Attraction',
  wiki_title text,
  nearest_stop_id text references public.stops(id) on delete set null,
  source text,
  source_url text,
  verification_status text not null default 'needs_verification'
    check (verification_status in ('verified', 'partially_verified', 'needs_verification', 'outdated')),
  last_verified_at timestamptz,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.destinations enable row level security;
grant select on public.destinations to anon, authenticated;
grant insert, update, delete on public.destinations to authenticated;

drop policy if exists "destinations: public read" on public.destinations;
create policy "destinations: public read" on public.destinations for select using (true);

drop policy if exists "destinations: admin write" on public.destinations;
create policy "destinations: admin write" on public.destinations
  for all using (public.is_admin()) with check (public.is_admin());

-- ===================== seed: current hardcoded data =====================
-- Mirrors src/data/attractions.js exactly, using the same ids, so the live
-- app behaves identically to today the moment this runs.
--
-- Source/verification is seeded ONLY where attractions.js's own file-level
-- citation comment explicitly names the destination in a parenthetical:
--   shellwanders.com (Temple of Leah, Sirao Garden)
--   travelsetu.com (Cebu Taoist Temple)
--   whycebu.com (Moalboal)
--   phbus.com (Oslob/Kawasan via South Bus Terminal)
-- Those six rows are seeded as 'verified'. The comment's first citation
-- (cebudailynews.inquirer.net/728043) carries no parenthetical naming which
-- destinations it covers — unlike the other four — so nothing is attributed
-- to it here; the three downtown historical sites are seeded as
-- 'needs_verification' rather than guessing which of them it applies to.
-- Mactan Shrine's "various how to get to Mactan Shrine guides" is not a
-- single checkable URL, so it's also 'needs_verification' with a null
-- source/source_url. Tops Lookout has no citation at all.
-- last_verified_at is left null for every row, including 'verified' ones —
-- the comment gives no real audit date, so stamping now() would itself be a
-- fabricated claim of "checked today."
insert into public.destinations
  (id, name, location, description, icon, category, wiki_title, nearest_stop_id, source, source_url, verification_status)
values
  ('magellans-cross', 'Magellan''s Cross', 'Colon, Downtown Cebu',
   'A 1521 wooden cross marking the arrival of Christianity in the Philippines, sheltered in a chapel beside the Basilica.',
   'ti-cross', 'Historical', 'Magellan''s Cross', 'basilica',
   null, null, 'needs_verification'),

  ('basilica-santo-nino', 'Basilica del Santo Niño', 'Osmeña Blvd, Downtown Cebu',
   'The oldest Roman Catholic church in the Philippines, home to the venerated Santo Niño relic.',
   'ti-building-church', 'Historical', 'Basilica del Santo Niño, Cebu', 'basilica',
   null, null, 'needs_verification'),

  ('fort-san-pedro', 'Fort San Pedro', 'Plaza Independencia, Downtown Cebu',
   'The oldest and smallest Spanish-era fort in the Philippines, built in 1738 to guard the city.',
   'ti-building-fortress', 'Historical', 'Fort San Pedro, Cebu', 'colon',
   null, null, 'needs_verification'),

  ('temple-of-leah', 'Temple of Leah', 'Busay, Cebu City (uphill)',
   'A Taj Mahal-inspired hilltop temple built as a monument to eternal love, with sweeping city views.',
   'ti-building-castle', 'Attraction', 'Temple of Leah', 'it-park',
   'Shell Wanders', 'https://shellwanders.com', 'verified'),

  ('taoist-temple', 'Cebu Taoist Temple', 'Beverly Hills, Lahug',
   'A colorful hillside Chinese temple with dragon staircases and incense courtyards.',
   'ti-building-pavilion', 'Attraction', 'Cebu Taoist Temple', 'it-park',
   'Travel Setu', 'https://travelsetu.com', 'verified'),

  ('sirao-garden', 'Sirao Garden', 'Busay, Cebu City (uphill)',
   'Colorful hillside flower fields nicknamed "Little Amsterdam", popular for photos at golden hour.',
   'ti-flower', 'Nature', 'Sirao Flower Garden', 'it-park',
   'Shell Wanders', 'https://shellwanders.com', 'verified'),

  ('tops', 'Tops Lookout', 'Busay, Cebu City (uphill)',
   'A mountaintop viewing deck above Temple of Leah with a panoramic view of Metro Cebu''s skyline.',
   'ti-binoculars', 'Nature', 'Tops Lookout', 'it-park',
   null, null, 'needs_verification'),

  ('kawasan-falls', 'Kawasan Falls', 'Matutinao, Badian (South Cebu)',
   'A turquoise three-tier waterfall in Badian and the Philippines'' top canyoneering spot.',
   'ti-droplet', 'Nature', 'Kawasan Falls', 'carbon',
   'PH Bus (South Bus Terminal schedules)', 'https://phbus.com', 'verified'),

  ('moalboal', 'Moalboal', 'Moalboal, South Cebu',
   'A laid-back dive town famous for its sardine run and nearby Pescador Island.',
   'ti-fish', 'Beach', 'Moalboal', 'carbon',
   'Why Cebu', 'https://whycebu.com', 'verified'),

  ('oslob', 'Oslob', 'Oslob, South Cebu',
   'Home to Cebu''s famous whale shark watching, in the waters off southern Cebu.',
   'ti-anchor', 'Beach', 'Oslob', 'carbon',
   'PH Bus (South Bus Terminal schedules)', 'https://phbus.com', 'verified'),

  ('mactan-shrine', 'Mactan Shrine', 'Punta Engaño, Lapu-Lapu City, Mactan Island',
   'A monument honoring Lapu-Lapu, the chieftain who defeated Ferdinand Magellan here in 1521.',
   'ti-award', 'Historical', 'Mactan Shrine', 'ayala',
   null, null, 'needs_verification')
on conflict (id) do nothing;
