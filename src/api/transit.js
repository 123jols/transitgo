import { stops } from "../data/db";
import { findRoutesBetween } from "../utils/routing";

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
