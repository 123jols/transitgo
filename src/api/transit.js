import { stops } from "../data/db";
import { terminals } from "../data/terminals";
import { attractions } from "../data/attractions";
import { findRoutesBetween, nearestStop } from "../utils/routing";
import { rankBySimilarity } from "../utils/fuzzyMatch";
import { searchCebuLandmark } from "../utils/geo";

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

// Same underlying place list as searchDestinations (stops + terminals +
// attractions/destinations), but ranked by fuzzy similarity instead of
// requiring a substring match — for resolving AI-extracted or typo-prone
// destination text (e.g. "jmall", "sto nino") against real, verified places
// only. Never invents a place: anything scoring below the threshold is
// simply not returned, so a query for somewhere not in the database (like
// "SM JMall" — see the routing audit) correctly comes back empty rather
// than forcing a bad guess. Deduped by underlying stop id, keeping each
// stop's single best-scoring label, so the same physical place doesn't
// appear twice (e.g. a stop and its same-location terminal).
export function resolveDestinationCandidates(query, { limit = 5 } = {}) {
  if (!query || !query.trim()) return [];

  const pool = [];
  stops.forEach((stop) => {
    pool.push({ id: stop.id, label: stop.name, subtitle: "Transit stop", stop });
  });
  terminals.forEach((terminal) => {
    if (!terminal.stopId) return;
    const stop = stopById[terminal.stopId];
    if (!stop) return;
    pool.push({ id: `terminal-${terminal.id}`, label: terminal.name, subtitle: "Terminal", stop });
  });
  attractions.forEach((spot) => {
    if (!spot.nearestStopId) return;
    const stop = stopById[spot.nearestStopId];
    if (!stop) return;
    pool.push({
      id: `attraction-${spot.id}`,
      label: spot.name,
      subtitle: `Tourist spot · routes via ${stop.name}`,
      stop,
    });
  });

  const ranked = rankBySimilarity(pool, query);

  const bestByStopId = new Map();
  for (const { item, score } of ranked) {
    const existing = bestByStopId.get(item.stop.id);
    if (!existing || score > existing.score) {
      bestByStopId.set(item.stop.id, { item, score });
    }
  }

  return [...bestByStopId.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item, score }) => ({ ...item, confidence: score }));
}

// "Are we in Cebu at all" cutoff for jumping off from a real-world landmark
// to a known stop — same radius HomePage.jsx's own GPS-to-stop resolution
// already uses, so a landmark match too far from any known stop is treated
// the same way an out-of-coverage GPS fix already is.
const MAX_LANDMARK_JUMP_KM = 20;

// Last-resort destination resolution: only called once resolveDestinationCandidates
// has already come back empty (even fuzzily) against the curated stops/
// terminals/destinations list. Looks the query up as a real place via
// OpenStreetMap (searchCebuLandmark) and jumps off from whichever known
// stop is nearest to it — the same "closest reachable jump-off" pattern
// data/attractions.js's nearestStopId already uses, just computed live
// instead of pre-curated. Never invents a route: a network failure, no
// OpenStreetMap match, or a real match too far from any known stop all
// resolve to null rather than guessing.
export async function resolveRealWorldLandmark(query) {
  let hit;
  try {
    hit = await searchCebuLandmark(query);
  } catch {
    return null;
  }
  if (!hit) return null;

  const stop = nearestStop(hit.lat, hit.lon, MAX_LANDMARK_JUMP_KM);
  if (!stop) return null;

  return {
    id: `landmark-${hit.lat}-${hit.lon}`,
    label: hit.label,
    subtitle: `Nearby place · routes via ${stop.name}`,
    stop,
  };
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
