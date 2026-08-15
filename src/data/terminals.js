import { haversineDistanceKm } from "../utils/geo";

// Terminal/transport-hub registry for the Terminals page.
// stopId links a terminal to a stop in db.js when the two are the same real
// place — that's what lets "View Routes" hand off to the actual jeepney
// route search. Terminals without a stopId (Parkmall, the two provincial bus
// terminals, the Mactan airport MyBus terminal) aren't part of the verified
// jeepney route graph, so "View Routes" for those just opens the Home tab
// rather than pretending a search result exists; their `routes` list is
// shown directly on the card instead.
// lat/lon are approximate landmark coordinates (same caveat as db.js stops),
// used only for the optional "nearby terminals" distance sort.
// Sources: en.wikipedia.org/wiki/Cebu_South_Bus_Terminal, en.wikipedia.org/
// wiki/Cebu_North_Bus_Terminal, phbus.com/cebu-south-bus-terminal, sugbo.ph
// (Parkmall jeepney routes), db.js jeepneyRoutes (for IT Park/SM City/Ayala).
//
// `hours` (first/last ride) sources, checked 2026-08-15:
// - it-park: ph.commutetour.com/ph/terminal/cebu-it-park ("04:00 AM to 09:50 PM")
// - sm-city: MyBus-specific hours from thetraveler.org (6:00 AM-9:00 PM,
//   ~20 min headway); other jeepney lines through this terminal may run
//   longer but aren't individually sourced, so the MyBus window is used.
// - south-bus-terminal: 2gobusandferries.com cites near round-the-clock
//   operation, schedule window ~1:00 AM-11:00 PM; Oslob-bound buses alone
//   leave every ~30 min given passenger volume.
// - north-bus-terminal: not 24hr — regular routes run 5:00 AM-6:00 PM
//   (schedules.ph / commutetour), but the long-haul Maya (Malapascua) run
//   has an earlier first bus at 3:00 AM. Bantayan-bound riders need to
//   leave by ~1:00 PM to catch the last Hagnaya ferry (bantayanisland.info).
// - parkmall / ayala: no published terminal hours found anywhere searched;
//   `sourced: false` marks these as typical-city-jeepney estimates only
//   (~5AM-9/10PM), not confirmed against the actual terminal.
// - mactan-airport-terminal: pisofare.ph and thetraveler.org (MyBus schedule
//   guides). No traditional jeepney route crosses Mactan-Mandaue/Marcelo
//   Fernan bridge per the cebudailynews.inquirer.net jeepney-code guide
//   already cited above — MyBus is the only sourced Lapu-Lapu<->Cebu City
//   connection, so it's listed here rather than invented as a jeepney code.
// `longRoute: true` marks the provincial bus terminals, where missing the
// last ride matters a lot more than for a city jeepney that just runs again
// in a few minutes — TerminalsPage gives those hours extra visual weight.
export const terminals = [
  {
    id: "it-park-terminal",
    name: "IT Park Terminal",
    location: "Cebu IT Park, Lahug, Cebu City",
    routes: ["04L", "17B", "MyBus (city bus)"],
    stopId: "it-park",
    lat: 10.3298,
    lon: 123.9057,
    hours: { first: "4:00 AM", last: "9:50 PM", sourced: true },
  },
  {
    id: "sm-city-terminal",
    name: "SM City Cebu Terminal",
    location: "North Reclamation Area, Cebu City",
    routes: ["04L", "MyBus (city bus)"],
    stopId: "sm-city",
    lat: 10.3111,
    lon: 123.9186,
    hours: { first: "6:00 AM", last: "9:00 PM", sourced: true, note: "MyBus hours; other jeepney lines may run later" },
  },
  {
    id: "parkmall-terminal",
    name: "Parkmall Terminal",
    location: "Ouano Ave, Mandaue Reclamation Area, Mandaue City",
    routes: ["25 (Liloan)", "24 (Consolacion)", "01K (Urgello)", "20A (Ayala–Mandaue)"],
    stopId: null,
    lat: 10.332,
    lon: 123.943,
    hours: { first: "5:00 AM", last: "9:00 PM", sourced: false },
  },
  {
    id: "ayala-terminal",
    name: "Ayala Center Cebu",
    location: "Cebu Business Park, Cebu City",
    routes: ["04L", "14D", "13C"],
    stopId: "ayala",
    lat: 10.3181,
    lon: 123.9056,
    hours: { first: "5:00 AM", last: "10:00 PM", sourced: false },
  },
  {
    id: "south-bus-terminal",
    name: "Cebu South Bus Terminal",
    location: "N. Bacalso Ave, Cebu City",
    routes: ["Bato via Barili (Moalboal, Badian/Kawasan Falls)", "Bato via Oslob (Oslob, Santander)"],
    stopId: null,
    lat: 10.286,
    lon: 123.887,
    hours: { first: "1:00 AM", last: "11:00 PM", sourced: true, note: "Near round-the-clock; Oslob buses depart every ~30 min" },
    longRoute: true,
  },
  {
    id: "north-bus-terminal",
    name: "Cebu North Bus Terminal",
    location: "North Reclamation Area, Cebu City (beside SM City Cebu)",
    routes: ["Maya, Daanbantayan (for Malapascua Island)", "Hagnaya, San Remigio (for Bantayan Island)"],
    stopId: null,
    lat: 10.3125,
    lon: 123.9175,
    hours: { first: "3:00 AM", last: "6:00 PM", sourced: true, note: "For Bantayan Island, leave by ~1:00 PM to catch the last Hagnaya ferry" },
    longRoute: true,
  },
  {
    id: "mactan-airport-terminal",
    name: "Mactan-Cebu Int'l Airport (MyBus)",
    location: "Lapu-Lapu City, Mactan Island",
    routes: ["MyBus: Airport → SM City Cebu → Ayala Center Cebu → IT Park Cebu"],
    stopId: null,
    lat: 10.3075,
    lon: 123.9789,
    hours: { first: "6:40 AM", last: "8:40 PM", sourced: true, note: "MyBus only, via Marcelo Fernan Bridge; return trip (IT Park → Airport) runs 7:00 AM-10:00 PM" },
    longRoute: true,
  },
];

// Real terminal spacing in this dataset is mostly 1-3km apart (city-scale,
// not walkable-scale) with one close pair (SM City/North Bus, ~196m) — 600m
// is a genuinely walkable cutoff without making "nothing in radius" the
// default case almost everywhere, the way a very tight ~250m radius would.
export const DEFAULT_TERMINAL_RADIUS_KM = 0.6;

// How close two terminals' distances have to be before route-count (more
// options at roughly the same walk) breaks the tie instead of raw distance
// alone. 150m comfortably covers the one close real pair above without ever
// promoting a terminal that's meaningfully farther away.
const TIEBREAK_DELTA_KM = 0.15;

// Terminals near a GPS fix, distance-sorted, terminals with more routes
// winning ties within TIEBREAK_DELTA_KM. `nearest`/`nearby` are the
// within-radius subset; when nothing qualifies, `nearest` falls back to the
// closest terminal regardless of distance (so callers always have a "show
// the nearest anyway" answer) and `nearby` stays empty.
export function nearestTerminals(lat, lon, radiusKm = DEFAULT_TERMINAL_RADIUS_KM) {
  const all = terminals
    .map((terminal) => ({ ...terminal, distanceKm: haversineDistanceKm({ lat, lon }, terminal) }))
    .sort((a, b) => {
      const d = a.distanceKm - b.distanceKm;
      if (Math.abs(d) > TIEBREAK_DELTA_KM) return d;
      return b.routes.length - a.routes.length;
    });

  const within = all.filter((t) => t.distanceKm <= radiusKm);
  const inRadius = within.length > 0;

  return {
    inRadius,
    nearest: inRadius ? within[0] : all[0] || null,
    nearby: inRadius ? within.slice(1) : [],
    all,
  };
}
