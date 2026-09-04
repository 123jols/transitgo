-- Adds 5 more verified destinations to public.destinations (created in
-- 004_destinations.sql): four student-relevant universities and one
-- heritage site not previously covered. Same table, same conventions —
-- this migration only inserts new rows, no schema changes.
--
-- Sources (checked 2026-09): cebudailynews.inquirer.net/707255 (EduRank
-- Cebu university rankings), Wikipedia articles for each institution,
-- casagorordomuseum.org. All five are seeded 'verified' since each name/
-- location is corroborated by at least one of these; last_verified_at is
-- left null (no real audit-date system in place yet, so stamping now()
-- would itself be a small fabrication — same reasoning as 004).
--
-- nearest_stop_id picks follow the same "closest reachable jump-off, not
-- the destination itself" pattern already used throughout this table:
--   usc-talamban -> talamban  (USC's Talamban campus IS in Talamban)
--   usjr-main    -> colon     (Magallanes/P. Lopez St, downtown core)
--   cnu-main     -> fuente    (on Osmeña Blvd, at Fuente Osmeña Circle)
--   up-cebu      -> it-park   (Gorordo Ave, Lahug — same district as IT Park)
--   casa-gorordo -> colon     (Parian district, adjacent to Colon Street)

insert into public.destinations
  (id, name, location, description, icon, category, wiki_title, nearest_stop_id, source, source_url, verification_status)
values
  ('usc-talamban', 'University of San Carlos – Talamban Campus', 'Nasipit, Talamban, Cebu City',
   'Cebu''s top-ranked university (8th nationally per EduRank), with its main science and engineering campus right in Talamban.',
   'ti-school', 'University', 'University of San Carlos', 'talamban',
   'Cebu Daily News (EduRank rankings) / Wikipedia', 'https://cebudailynews.inquirer.net/707255', 'verified'),

  ('usjr-main', 'University of San Jose–Recoletos', 'Magallanes & P. Lopez Streets, Cebu City',
   'A private Catholic university in the heart of downtown Cebu, run by the Augustinian Recollects.',
   'ti-school', 'University', 'University of San Jose–Recoletos', 'colon',
   'Wikipedia', 'https://en.wikipedia.org/wiki/University_of_San_Jose%E2%80%93Recoletos', 'verified'),

  ('cnu-main', 'Cebu Normal University', 'Osmeña Boulevard, Cebu City',
   'A public university right on Osmeña Boulevard, a short walk from Fuente Osmeña Circle.',
   'ti-school', 'University', 'Cebu Normal University', 'fuente',
   'Wikipedia', 'https://en.wikipedia.org/wiki/Cebu_Normal_University', 'verified'),

  ('up-cebu', 'University of the Philippines Cebu', 'Gorordo Avenue, Lahug, Cebu City',
   'UP''s Cebu campus, in the Lahug district near IT Park.',
   'ti-school', 'University', 'University of the Philippines Cebu', 'it-park',
   'Wikipedia', 'https://en.wikipedia.org/wiki/University_of_the_Philippines_Cebu', 'verified'),

  ('casa-gorordo', 'Casa Gorordo Museum', '35 Eduardo Aboitiz St, Parian, Cebu City',
   'A restored 1850s bahay-na-bato mansion in the historic Parian district, a National Historical Landmark since 1991.',
   'ti-home-2', 'Historical', 'Casa Gorordo', 'colon',
   'Casa Gorordo Museum (official site)', 'https://www.casagorordomuseum.org/', 'verified')
on conflict (id) do nothing;
