import { stops, jeepneyRoutes, walkLinks } from "../data/db";
import { terminals, DEFAULT_TERMINAL_RADIUS_KM } from "../data/terminals";
import { haversineDistanceKm } from "./geo";

// Rebuilt (not just read once) by rebuildRoutingGraph() below, since `stops`
// is itself replaced in place after a live data load — a stale stopById
// snapshot from module-load time would still resolve old ids.
let stopById = Object.fromEntries(stops.map((s) => [s.id, s]));

// Standard Philippine LTFRB jeepney minimum-fare matrix: flat minimum fare
// for the first few km, then a per-km increment beyond that. Not a
// route-specific number — a public, well-known fare formula applied to the
// real distance between the actual boarding/alighting stops. LTFRB-jeepney-
// specific: would mis-price a `type: "bus"` leg if one's ever added to
// jeepneyRoutes (none exist today — buses are shown as info badges only).
// Rate effective March 19, 2026 (LTFRB nationwide traditional-jeepney fare
// hike: P13→P14 first 4km, P1.80→P2.00/km after — still in effect as of
// this writing; a since-filed Piston petition to raise fares further from
// this same P14 base confirms it held rather than being rolled back).
// Sources: philstar.com/the-freeman/cebu-news/2026/03/18/2515167,
// rappler.com/newsbreak/iq/fare-increase-jeepneys-buses-ride-hailing-philippines-march-19-2026,
// philstar.com/headlines/2026/04/21/2522489 (Piston P10-more petition).
const JEEPNEY_SPEED_KMH = 12; // conservative stop-and-go urban average
const MIN_FARE = 14;
const MIN_FARE_KM = 4;
const PER_KM_RATE = 2;

// Exported for the admin route form's live "Estimated fare/duration"
// readout — the whole point of computing fare from a formula instead of
// letting an admin type an arbitrary number is that it can't drift from
// the real distance between whatever stops they've actually picked.
export function fareForDistance(km) {
  if (km <= MIN_FARE_KM) return MIN_FARE;
  return Math.round(MIN_FARE + (km - MIN_FARE_KM) * PER_KM_RATE);
}

export function durationForDistance(km) {
  return Math.max(3, Math.round((km / JEEPNEY_SPEED_KMH) * 60));
}

function segmentDistanceKm(stopIds) {
  let total = 0;
  for (let i = 0; i < stopIds.length - 1; i++) {
    total += haversineDistanceKm(stopById[stopIds[i]], stopById[stopIds[i + 1]]);
  }
  return total;
}

// Every boarding→alighting pair (in sequence order) along a route is a valid
// single-ride edge — a rider does not transfer just because the jeepney
// passes an intermediate stop on its way.
function buildRideEdges() {
  const edges = [];
  jeepneyRoutes.forEach((route) => {
    const { stopIds } = route;
    for (let i = 0; i < stopIds.length - 1; i++) {
      for (let j = i + 1; j < stopIds.length; j++) {
        const segment = stopIds.slice(i, j + 1);
        const distanceKm = segmentDistanceKm(segment);
        edges.push({
          fromId: stopIds[i],
          toId: stopIds[j],
          route,
          distanceKm,
          fare: fareForDistance(distanceKm),
          duration: durationForDistance(distanceKm),
        });
      }
    }
  });
  return edges;
}

function buildWalkEdges() {
  const edges = [];
  walkLinks.forEach(({ stopIds: [a, b], minutes }) => {
    edges.push({ fromId: a, toId: b, minutes });
    edges.push({ fromId: b, toId: a, minutes });
  });
  return edges;
}

let rideEdges = buildRideEdges();
let walkEdges = buildWalkEdges();

// Recomputes stopById + both edge lists from the current contents of
// stops/jeepneyRoutes/walkLinks. Called once at module load (line above,
// same as before this existed) and again by src/lib/transitSync.js right
// after replaceTransitData() mutates those arrays — the DFS pathfinding
// below (findPaths) always reads the current rideEdges/walkEdges bindings,
// so a rebuild here is all live search needs to pick up admin changes.
export function rebuildRoutingGraph() {
  stopById = Object.fromEntries(stops.map((s) => [s.id, s]));
  rideEdges = buildRideEdges();
  walkEdges = buildWalkEdges();
}

const MAX_RIDES = 3;
const MAX_WALK_LEGS = 2;
const MAX_TOTAL_LEGS = 6;
const MAX_RESULTS = 6;

function findPaths(fromId, toId) {
  const results = [];

  function dfs(currentId, visited, legs, rideCount, walkCount) {
    if (legs.length >= MAX_TOTAL_LEGS) return;

    if (currentId === toId && legs.length > 0) {
      results.push([...legs]);
      return;
    }
    if (rideCount >= MAX_RIDES) return;

    rideEdges
      .filter((e) => e.fromId === currentId && !visited.has(e.toId))
      .forEach((e) => {
        visited.add(e.toId);
        legs.push({ kind: "ride", edge: e });
        dfs(e.toId, visited, legs, rideCount + 1, walkCount);
        legs.pop();
        visited.delete(e.toId);
      });

    if (walkCount < MAX_WALK_LEGS) {
      walkEdges
        .filter((e) => e.fromId === currentId && !visited.has(e.toId))
        .forEach((e) => {
          visited.add(e.toId);
          legs.push({ kind: "walk", edge: e });
          dfs(e.toId, visited, legs, rideCount, walkCount + 1);
          legs.pop();
          visited.delete(e.toId);
        });
    }
  }

  dfs(fromId, new Set([fromId]), [], 0, 0);
  return results;
}

function legsToRouteObject(legs) {
  const rideLegs = legs.filter((l) => l.kind === "ride");
  const fare = rideLegs.reduce((sum, l) => sum + l.edge.fare, 0);
  const duration = legs.reduce((sum, l) => sum + (l.kind === "ride" ? l.edge.duration : l.edge.minutes), 0);
  const transfers = Math.max(0, rideLegs.length - 1);
  const type = rideLegs.length ? rideLegs[0].edge.route.type : "walk";
  const label = rideLegs.length
    ? rideLegs.map((l) => l.edge.route.code).join(" → ")
    : "Walking route";

  const stopNames = [];
  legs.forEach((l, i) => {
    if (i === 0) stopNames.push(stopById[l.edge.fromId].name);
    stopNames.push(stopById[l.edge.toId].name);
  });

  return {
    id: `trip-${legs.map((l) => `${l.edge.fromId}-${l.edge.toId}`).join("_")}`,
    type,
    label,
    fare,
    duration,
    transfers,
    stops: stopNames,
    legs: legs.map((l) => ({
      kind: l.kind,
      code: l.kind === "ride" ? l.edge.route.code : null,
      direction: l.kind === "ride" ? l.edge.route.direction : null,
      fromId: l.edge.fromId,
      toId: l.edge.toId,
      fromName: stopById[l.edge.fromId].name,
      toName: stopById[l.edge.toId].name,
      fare: l.kind === "ride" ? l.edge.fare : 0,
      duration: l.kind === "ride" ? l.edge.duration : l.edge.minutes,
    })),
  };
}

// Fewest transfers first, then fastest, then cheapest — the single ranking
// rule for "which trip is better," shared by findRoutesBetween's own result
// ordering and by bestTerminalFor's cross-candidate comparison below so
// there's one definition of "best," not two that could quietly disagree.
export function compareTrips(a, b) {
  if (a.transfers !== b.transfers) return a.transfers - b.transfers;
  if (a.duration !== b.duration) return a.duration - b.duration;
  return a.fare - b.fare;
}

// Finds real, direction-aware commuter itineraries between two stop IDs.
// Searches direct routes first, then 1, 2, and up to 3 rides with transfers,
// ranked by fewest rides, then duration, then fare.
export function findRoutesBetween(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return [];

  const routeObjects = findPaths(fromId, toId).map(legsToRouteObject);

  const seen = new Set();
  const deduped = routeObjects.filter((r) => {
    const key = r.stops.join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort(compareTrips);

  return deduped.slice(0, MAX_RESULTS);
}

// The known stop nearest a GPS fix, or null if none are within maxKm.
export function nearestStop(lat, lon, maxKm) {
  const nearest = stops
    .map((stop) => ({ stop, distanceKm: haversineDistanceKm({ lat, lon }, stop) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
  return nearest && nearest.distanceKm <= maxKm ? nearest.stop : null;
}

const NEARBY_ROUTE_RADIUS_KM = 1.5;

// Jeepney routes actually boardable near a GPS fix — stops within radiusKm,
// then the routes that call at any of them, deduped by code (each code has
// a separate entry per direction; both share one physical line). Distinct
// from nearestStop/MAX_AUTO_LOCATE_KM's ~20km "are we in Cebu at all" check:
// this is a tight, walkable radius, so it stays genuinely selective instead
// of just returning every route in the graph from anywhere in the metro.
// Falls back to the 3 nearest stops regardless of radius (labeled with
// their distance) so the caller never hits a hard empty state.
export function findNearbyRoutes(lat, lon, radiusKm = NEARBY_ROUTE_RADIUS_KM) {
  const withDistance = stops
    .map((stop) => ({ stop, distanceKm: haversineDistanceKm({ lat, lon }, stop) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const nearby = withDistance.filter((d) => d.distanceKm <= radiusKm);
  const nearbyIds = new Set(nearby.map((d) => d.stop.id));

  if (nearbyIds.size === 0) {
    return {
      routes: [],
      fallbackStops: withDistance.slice(0, 3),
    };
  }

  const distanceByStopId = Object.fromEntries(withDistance.map((d) => [d.stop.id, d.distanceKm]));
  const seenCodes = new Set();
  const routes = [];

  jeepneyRoutes.forEach((route) => {
    if (seenCodes.has(route.code)) return;
    const stopIdsHere = route.stopIds.filter((id) => nearbyIds.has(id));
    if (!stopIdsHere.length) return;
    seenCodes.add(route.code);
    const closestStopKm = Math.min(...stopIdsHere.map((id) => distanceByStopId[id]));
    routes.push({ code: route.code, route, distanceKm: closestStopKm });
  });

  routes.sort((a, b) => a.distanceKm - b.distanceKm);
  return { routes, fallbackStops: [] };
}

// Which known terminal actually gives the best trip to a destination —
// NOT just the nearest one. Only terminals with a stopId are routable
// (data/terminals.js: 5 of the 8 are informational-only, e.g. the
// provincial bus terminals); among those, distance and trip quality can
// genuinely disagree (a slightly farther terminal can have a direct route
// while the nearest one needs a transfer), so this actually runs
// findRoutesBetween per candidate and ranks by compareTrips rather than
// assuming "closest terminal" is "best terminal."
//
// This is informational only — it never changes what a rider's own
// resolved origin stop is used to search (that stays whatever nearestStop
// already picked, which correctly includes the 5 non-terminal stops too).
// Restricting real trip search to terminals-only would be a regression for
// any origin whose nearest stop isn't one of the 3 routable terminals.
export function bestTerminalFor(originLatLon, destStopId, radiusKm = DEFAULT_TERMINAL_RADIUS_KM) {
  if (!destStopId) return null;

  const routable = terminals
    .filter((t) => t.stopId)
    .map((t) => ({ terminal: t, distanceKm: haversineDistanceKm(originLatLon, t) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  if (!routable.length) return null;

  const within = routable.filter((t) => t.distanceKm <= radiusKm);
  const candidates = within.length ? within : routable.slice(0, 1);

  let best = null;
  candidates.forEach(({ terminal, distanceKm }) => {
    if (terminal.stopId === destStopId) return; // already there
    const trip = findRoutesBetween(terminal.stopId, destStopId)[0];
    if (!trip) return;
    if (!best || compareTrips(trip, best.trip) < 0) {
      best = { terminal, distanceKm, trip };
    }
  });

  return best;
}
