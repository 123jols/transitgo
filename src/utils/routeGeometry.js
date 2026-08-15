import { stops, jeepneyRoutes } from "../data/db";
import { haversineDistanceKm, walkingMinutes } from "./geo";

const stopById = Object.fromEntries(stops.map((s) => [s.id, s]));

// Turns a findRoutesBetween() trip into map-ready geometry: one polyline
// per leg (colored/dashed by the caller per leg.kind/code), transfer-point
// markers, and the synthetic first-mile walk from the user's live GPS fix
// to the nearest known stop — that hop isn't a graph edge, so it has to be
// assembled here rather than read off the trip.
//
// Pure data in/out — no Leaflet or React — so it's easy to reason about and
// test in isolation.
export function assembleTripGeometry(trip, userLatLon, destStop) {
  if (!trip || !trip.legs?.length || !userLatLon || !destStop) return null;

  const originStop = stopById[trip.legs[0].fromId];
  if (!originStop) return null;

  const firstMileKm = haversineDistanceKm(userLatLon, originStop);
  const syntheticWalkMinutes = walkingMinutes(firstMileKm);

  const segments = [
    // Synthetic first-mile walk: GPS fix -> nearest stop. Not a graph edge,
    // so trip.duration below does NOT include this — callers must add
    // syntheticWalkMinutes on top for a true door-to-door ETA.
    {
      kind: "walk",
      code: null,
      latlngs: [
        [userLatLon.lat, userLatLon.lon],
        [originStop.lat, originStop.lon],
      ],
    },
  ];

  trip.legs.forEach((leg) => {
    const fromStop = stopById[leg.fromId];
    const toStop = stopById[leg.toId];
    if (!fromStop || !toStop) return;

    if (leg.kind === "walk") {
      segments.push({
        kind: "walk",
        code: null,
        latlngs: [[fromStop.lat, fromStop.lon], [toStop.lat, toStop.lon]],
      });
      return;
    }

    // Ride leg: find the physical route entry and slice its stopIds between
    // fromId/toId so the line passes through real intermediate stops
    // instead of cutting a straight chord across them.
    const routeEntry = jeepneyRoutes.find((r) => r.code === leg.code && r.direction === leg.direction);
    let waypointIds = [leg.fromId, leg.toId];
    if (routeEntry) {
      const fromIdx = routeEntry.stopIds.indexOf(leg.fromId);
      const toIdx = routeEntry.stopIds.indexOf(leg.toId);
      if (fromIdx !== -1 && toIdx !== -1) {
        waypointIds = fromIdx <= toIdx
          ? routeEntry.stopIds.slice(fromIdx, toIdx + 1)
          : routeEntry.stopIds.slice(toIdx, fromIdx + 1).reverse();
      }
    }

    segments.push({
      kind: "ride",
      code: leg.code,
      type: routeEntry?.type || "jeepney",
      latlngs: waypointIds.map((id) => [stopById[id].lat, stopById[id].lon]),
    });
  });

  // Transfer points: the stop between two consecutive ride legs with a
  // different code — matches trip.transfers (rideLegs.length - 1) exactly,
  // so the marker count on the map always agrees with the fare card.
  const transferPoints = [];
  const rideLegs = trip.legs.filter((l) => l.kind === "ride");
  for (let i = 0; i < rideLegs.length - 1; i++) {
    if (rideLegs[i].code !== rideLegs[i + 1].code) {
      const stop = stopById[rideLegs[i].toId];
      if (stop) transferPoints.push(stop);
    }
  }

  return {
    segments,
    transferPoints,
    originPoint: { lat: userLatLon.lat, lon: userLatLon.lon },
    destPoint: { lat: destStop.lat, lon: destStop.lon },
    syntheticWalkMinutes,
  };
}
