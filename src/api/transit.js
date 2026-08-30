import { stops } from "../data/db";
import { terminals } from "../data/terminals";
import { attractions } from "../data/attractions";
import { findRoutesBetween } from "../utils/routing";

const stopById = Object.fromEntries(stops.map((s) => [s.id, s]));

// Curated pairs shown as "Popular routes" chips. Kept small and using stop
// IDs that actually exist in the verified network.
const POPULAR_PAIRS = [
  ["it-park", "sm-city"],
  ["sm-city", "it-park"],
  ["it-park", "ayala"],
  ["ayala", "colon"],
];

export function searchStops(query) {
  return stops.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );
}

// Destination search for the "Where to?" field: matches not just the 8
// verified jeepney stops but also terminals and tourist attractions already
// in the app (data/terminals.js, data/attractions.js), so searching "SM
// Seaside" or "Kawasan Falls" surfaces a result even though neither is
// itself a routable graph node. Each hit resolves to the real stop routing
// actually runs against (via stopId/nearestStopId — same jump-off pattern
// TerminalsPage and TouristSpots already use) with a `label`/`subtitle` for
// display, distinct from the underlying stop's own name — mirrors how
// HomePage.jsx's buildCurrentLocationStop shows a real reverse-geocoded
// address while still anchoring routing on the nearest graph stop.
// Deliberately does NOT invent unsourced stops (schools, hospitals, the
// airport as a jeepney-reachable node) — this app only routes to places
// with a verified path in data/db.js.
export function searchDestinations(query) {
  const q = query.toLowerCase();
  const results = [];
  const seenStopIds = new Set();

  stops.forEach((stop) => {
    if (!stop.name.toLowerCase().includes(q)) return;
    results.push({ id: stop.id, label: stop.name, subtitle: "Transit stop", stop });
    seenStopIds.add(stop.id);
  });

  terminals.forEach((terminal) => {
    if (!terminal.stopId || !terminal.name.toLowerCase().includes(q)) return;
    if (seenStopIds.has(terminal.stopId) && terminal.name === stopById[terminal.stopId]?.name) return;
    const stop = stopById[terminal.stopId];
    if (!stop) return;
    results.push({ id: `terminal-${terminal.id}`, label: terminal.name, subtitle: "Terminal", stop });
  });

  attractions.forEach((spot) => {
    if (!spot.nearestStopId || !spot.name.toLowerCase().includes(q)) return;
    const stop = stopById[spot.nearestStopId];
    if (!stop) return;
    results.push({
      id: `attraction-${spot.id}`,
      label: spot.name,
      subtitle: `Tourist spot · routes via ${stop.name}`,
      stop,
    });
  });

  return results;
}

export function findRoutes(fromId, toId) {
  return findRoutesBetween(fromId, toId);
}

export function getStops() {
  return stops;
}

// Kept for backward compatibility with the (currently unused) "add a route"
// form in HomePage.jsx. Not wired into the verified route graph — this app's
// routing now only searches the sourced, verified network in data/db.js.
export function addRoute() {}

export function getPopularRoutes() {
  return POPULAR_PAIRS.map(([fromId, toId]) => {
    const from = stops.find((stop) => stop.id === fromId);
    const to = stops.find((stop) => stop.id === toId);
    const [route] = findRoutesBetween(fromId, toId);

    return {
      from,
      to,
      label: `${from?.name || fromId} → ${to?.name || toId}`,
      route,
    };
  }).filter((entry) => entry.route);
}
