// Metro Cebu stop/landmark registry.
// Coordinates are approximate landmark locations, not surveyed jeepney stop poles.
//
// These three arrays are the seed/fallback AND the live app's actual data
// source at the same time: replaceTransitData() (called by src/lib/transitSync.js
// once at boot, after fetching from Supabase) mutates them in place rather
// than reassigning the export, so every existing importer of `stops`/
// `jeepneyRoutes`/`walkLinks` across the app keeps working unchanged and
// automatically sees live data — no subscriptions, no React state needed
// here. If Supabase is unreachable or unconfigured, these hardcoded values
// are what the app runs on, same as before the admin dashboard existed.
export const stops = [
  { id: "it-park", name: "IT Park Cebu", type: "business", lat: 10.3298, lon: 123.9057 },
  { id: "sm-city", name: "SM City Cebu", type: "mall", lat: 10.3111, lon: 123.9186 },
  { id: "ayala", name: "Ayala Center Cebu", type: "mall", lat: 10.3181, lon: 123.9056 },
  { id: "colon", name: "Colon Street", type: "landmark", lat: 10.2938, lon: 123.9016 },
  { id: "basilica", name: "Basilica del Santo Niño", type: "landmark", lat: 10.2938, lon: 123.9022 },
  { id: "fuente", name: "Fuente Osmeña Circle", type: "landmark", lat: 10.3103, lon: 123.8925 },
  { id: "carbon", name: "Carbon Market", type: "landmark", lat: 10.2939, lon: 123.8998 },
  { id: "talamban", name: "Talamban", type: "district", lat: 10.3654, lon: 123.8917 },
  { id: "liloan", name: "Liloan Public Market", type: "landmark", lat: 10.42195, lon: 123.99573 },
];

// Verified traditional Cebu jeepney routes. Each entry is ONE physical route
// (a jeepney travels its full stopIds sequence); a rider can board/alight at
// any two stops on the same route without transferring. Both travel
// directions of a code are listed as separate entries since Cebu jeepney
// letter-suffixes are route *variants*, not reliable direction markers
// (see source notes) — we only encode the two directions we could verify.
//
// Fare/duration are NOT sourced from research (no public source publishes
// per-route minute/peso figures) — they are computed elsewhere from real
// stop coordinates using the standard LTFRB minimum-fare formula and a
// conservative urban jeepney speed, not invented per-route numbers.
export const jeepneyRoutes = [
  {
    id: "04l-itpark-sm",
    code: "04L",
    type: "jeepney",
    direction: "IT Park Cebu → Ayala Center Cebu → SM City Cebu",
    stopIds: ["it-park", "ayala", "sm-city"],
    verified: true,
    source: "https://cebudailynews.inquirer.net/728043/lost-in-cebu-heres-a-guide-to-cebu-citys-jeepney-route-codes ; https://ph.commutetour.com/ph/routes/cebu-routes/cebu-jeep/04l/",
    lastUpdated: "2026",
  },
  {
    id: "04l-sm-itpark",
    code: "04L",
    type: "jeepney",
    direction: "SM City Cebu → Ayala Center Cebu → IT Park Cebu",
    stopIds: ["sm-city", "ayala", "it-park"],
    verified: true,
    source: "https://cebudailynews.inquirer.net/728043/lost-in-cebu-heres-a-guide-to-cebu-citys-jeepney-route-codes ; https://ph.commutetour.com/ph/routes/cebu-routes/cebu-jeep/04l/",
    lastUpdated: "2026",
  },
  {
    id: "17b-itpark-carbon",
    code: "17B",
    type: "jeepney",
    direction: "IT Park Cebu (Apas) → Fuente Osmeña Circle → Carbon Market",
    stopIds: ["it-park", "fuente", "carbon"],
    verified: true,
    source: "https://cebudailynews.inquirer.net/728043/lost-in-cebu-heres-a-guide-to-cebu-citys-jeepney-route-codes ; https://travelsetu.com/guide/basilica-minore-del-santo-nino-tourism/how-to-reach-basilica-minore-del-santo-nino",
    lastUpdated: "2026",
  },
  {
    id: "17b-carbon-itpark",
    code: "17B",
    type: "jeepney",
    direction: "Carbon Market → Fuente Osmeña Circle → IT Park Cebu (Apas)",
    stopIds: ["carbon", "fuente", "it-park"],
    verified: true,
    source: "https://cebudailynews.inquirer.net/728043/lost-in-cebu-heres-a-guide-to-cebu-citys-jeepney-route-codes ; https://travelsetu.com/guide/basilica-minore-del-santo-nino-tourism/how-to-reach-basilica-minore-del-santo-nino",
    lastUpdated: "2026",
  },
  {
    id: "14d-ayala-colon",
    code: "14D",
    type: "jeepney",
    direction: "Ayala Center Cebu / Capitol → Colon Street",
    stopIds: ["ayala", "colon"],
    verified: true,
    source: "https://cebudailynews.inquirer.net/728043/lost-in-cebu-heres-a-guide-to-cebu-citys-jeepney-route-codes ; https://ph.commutetour.com/ph/terminal/ayala-center-cebu/",
    lastUpdated: "2026",
  },
  {
    id: "14d-colon-ayala",
    code: "14D",
    type: "jeepney",
    direction: "Colon Street → Ayala Center Cebu / Capitol",
    stopIds: ["colon", "ayala"],
    verified: true,
    source: "https://cebudailynews.inquirer.net/728043/lost-in-cebu-heres-a-guide-to-cebu-citys-jeepney-route-codes ; https://ph.commutetour.com/ph/terminal/ayala-center-cebu/",
    lastUpdated: "2026",
  },
  {
    id: "13c-talamban-colon",
    code: "13C",
    type: "jeepney",
    direction: "Talamban → Ayala Center Cebu → Colon Street",
    stopIds: ["talamban", "ayala", "colon"],
    verified: true,
    source: "https://cebudailynews.inquirer.net/728043/lost-in-cebu-heres-a-guide-to-cebu-citys-jeepney-route-codes ; https://ph.commutetour.com/ph/terminal/ayala-center-cebu/",
    lastUpdated: "2026",
  },
  {
    id: "13c-colon-talamban",
    code: "13C",
    type: "jeepney",
    direction: "Colon Street → Ayala Center Cebu → Talamban",
    stopIds: ["colon", "ayala", "talamban"],
    verified: true,
    source: "https://cebudailynews.inquirer.net/728043/lost-in-cebu-heres-a-guide-to-cebu-citys-jeepney-route-codes ; https://ph.commutetour.com/ph/terminal/ayala-center-cebu/",
    lastUpdated: "2026",
  },
  {
    id: "25-liloan-sm",
    code: "25",
    type: "jeepney",
    direction: "Liloan → Consolacion → Mandaue → North Bus Terminal → SM City Cebu",
    stopIds: ["liloan", "sm-city"],
    verified: true,
    source: "https://cebujeepneys.weebly.com/25.html ; https://sugbo.ph/2024/cebu-jeepney-routes/ (Parkmall Terminal entry in data/terminals.js also lists \"25 (Liloan)\")",
    lastUpdated: "2026",
  },
  {
    id: "25-sm-liloan",
    code: "25",
    type: "jeepney",
    direction: "SM City Cebu → North Bus Terminal → Mandaue → Consolacion → Liloan",
    stopIds: ["sm-city", "liloan"],
    verified: true,
    source: "https://cebujeepneys.weebly.com/25.html ; https://sugbo.ph/2024/cebu-jeepney-routes/ (Parkmall Terminal entry in data/terminals.js also lists \"25 (Liloan)\")",
    lastUpdated: "2026",
  },
];

// Short, unfarebox walking connections between adjacent downtown landmarks.
// Not jeepney routes — used by the router as free, no-transfer-count legs.
export const walkLinks = [
  { stopIds: ["carbon", "colon"], minutes: 5 },
  { stopIds: ["colon", "basilica"], minutes: 8 },
];

// Replaces the contents of stops/jeepneyRoutes/walkLinks in place (mutating
// the arrays above, not reassigning these `const` bindings) so every module
// that already imported them keeps a live reference to the same arrays.
// Called once at boot by src/lib/transitSync.js after a successful Supabase
// fetch; never called at all if Supabase isn't configured or the fetch
// fails, in which case the hardcoded seed above stays in effect.
export function replaceTransitData({ stops: newStops, routes: newRoutes, walkLinks: newWalkLinks }) {
  stops.splice(0, stops.length, ...newStops);
  jeepneyRoutes.splice(0, jeepneyRoutes.length, ...newRoutes);
  walkLinks.splice(0, walkLinks.length, ...newWalkLinks);
}
