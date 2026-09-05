-- Adds 2 more verified destinations to public.destinations: SM J Mall and
-- SM City Consolacion. Same table (004_destinations.sql), no schema changes.
--
-- Sources: cebudailynews.inquirer.net/602283 and en.wikipedia.org/wiki/SM_J_Mall
-- (SM J Mall — opened 2024-10-25, the former J Centre Mall after SM Prime's
-- acquisition in Mandaue); business.inquirer.net/63033 (SM City Consolacion,
-- opened 2012, Cebu North Road, Barangay Lamac, Consolacion).
--
-- Neither is on the verified jeepney graph directly, so both jump off from
-- sm-city — the routable node closest to the Mandaue/Consolacion corridor,
-- the same one route 25's Liloan-bound path already runs through.

insert into public.destinations
  (id, name, location, description, icon, category, wiki_title, nearest_stop_id, source, source_url, verification_status)
values
  ('sm-j-mall', 'SM J Mall', '165 A.S. Fortuna St, Barangay Bakilid, Mandaue City',
   'A Japanese-inspired SM mall in Mandaue reopened in 2024 on the site of the former J Centre Mall, with an outdoor izakaya dining strip and a rooftop recreation area.',
   'ti-building-store', 'Mall', 'SM J Mall', 'sm-city',
   'Cebu Daily News / Wikipedia', 'https://en.wikipedia.org/wiki/SM_J_Mall', 'verified'),

  ('sm-consolacion', 'SM City Consolacion', 'Cebu North Road, Barangay Lamac, Consolacion',
   'SM Prime''s second mall in Cebu province, opened in 2012 along the Liloan-bound corridor in Consolacion.',
   'ti-building-store', 'Mall', 'SM City Consolacion', 'sm-city',
   'Philippine Daily Inquirer (Business)', 'https://business.inquirer.net/63033/sm-city-consolacion-opens-in-cebu', 'verified')
on conflict (id) do nothing;
