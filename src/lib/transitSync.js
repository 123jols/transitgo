import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { replaceTransitData } from "../data/db";
import { replaceTerminals } from "../data/terminals";
import { replaceAttractions } from "../data/attractions";
import { rebuildRoutingGraph } from "../utils/routing";

function toStop(row) {
  return { id: row.id, name: row.name, type: row.type, lat: row.lat, lon: row.lon };
}

function toDestination(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    description: row.description,
    icon: row.icon,
    category: row.category,
    wikiTitle: row.wiki_title,
    nearestStopId: row.nearest_stop_id,
  };
}

function toTerminal(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    routes: row.routes || [],
    stopId: row.stop_id,
    lat: row.lat,
    lon: row.lon,
    hours: { first: row.hours_first, last: row.hours_last, sourced: row.hours_sourced, note: row.hours_note || undefined },
    longRoute: row.long_route,
  };
}

// Rebuilds jeepneyRoutes' stopIds shape (an ordered array of stop ids per
// route) from the flat route_stops join rows — fetched separately rather
// than via a nested Supabase select so this doesn't depend on embedded-
// resource ordering syntax.
function groupRouteStops(routeStopRows) {
  const byRoute = new Map();
  routeStopRows
    .slice()
    .sort((a, b) => a.stop_order - b.stop_order)
    .forEach((row) => {
      if (!byRoute.has(row.route_id)) byRoute.set(row.route_id, []);
      byRoute.get(row.route_id).push(row.stop_id);
    });
  return byRoute;
}

// Fetches active stops/routes/walk_links/terminals from Supabase and swaps
// them into the app's live in-memory data (see replaceTransitData/
// replaceTerminals + rebuildRoutingGraph). Failure of any kind — offline,
// Supabase not configured, a query error — just leaves the hardcoded seed
// data in data/db.js/data/terminals.js in place, same as the rest of the
// app's guest/offline fallback behavior.
export async function loadLiveTransitData() {
  if (!isSupabaseConfigured) return;

  try {
    const [stopsRes, routesRes, routeStopsRes, walkLinksRes, terminalsRes, destinationsRes] = await Promise.all([
      supabase.from("stops").select("*").eq("status", "active"),
      supabase.from("routes").select("*").eq("status", "active"),
      supabase.from("route_stops").select("route_id, stop_id, stop_order"),
      supabase.from("walk_links").select("*").eq("status", "active"),
      supabase.from("terminals").select("*").eq("status", "active"),
      supabase.from("destinations").select("*").eq("status", "active"),
    ]);

    const firstError = [stopsRes, routesRes, routeStopsRes, walkLinksRes, terminalsRes, destinationsRes].find((r) => r.error)?.error;
    if (firstError) throw firstError;

    const stopsById = new Set(stopsRes.data.map((s) => s.id));
    const stopIdsByRoute = groupRouteStops(routeStopsRes.data);

    const routes = routesRes.data
      .map((r) => ({
        id: r.id,
        code: r.code,
        type: r.type,
        direction: r.direction,
        stopIds: (stopIdsByRoute.get(r.id) || []).filter((id) => stopsById.has(id)),
      }))
      // A route with fewer than 2 real stops can't form a ride edge — drop
      // rather than let routing.js choke on a degenerate segment.
      .filter((r) => r.stopIds.length >= 2);

    const walkLinks = walkLinksRes.data
      .map((w) => ({ stopIds: [w.stop_a_id, w.stop_b_id], minutes: w.minutes }))
      .filter((w) => stopsById.has(w.stopIds[0]) && stopsById.has(w.stopIds[1]));

    replaceTransitData({ stops: stopsRes.data.map(toStop), routes, walkLinks });
    replaceTerminals(terminalsRes.data.map(toTerminal));
    // A destination whose nearest_stop_id no longer resolves to an active
    // stop is NOT filtered out here (unlike walkLinks/routes above) — it
    // should still show up in Explore, just non-routable. TouristSpots.jsx's
    // AttractionCard already handles that via disabled={!stop}.
    replaceAttractions(destinationsRes.data.map(toDestination));
    rebuildRoutingGraph();
  } catch (err) {
    console.warn("Could not load live transit data from Supabase — using bundled data instead", err);
  }
}

// Same function, exported under a second name for readability at admin call
// sites ("refresh after I just wrote something") vs. the boot call site
// ("load for the first time") — behavior is identical either way.
export const refreshLiveTransitData = loadLiveTransitData;
