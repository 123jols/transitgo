import { attractions } from "../data/attractions";
import { haversineDistanceKm } from "../utils/geo";
import ExplorePlaceCard from "./ExplorePlaceCard";

const NEARBY_LIMIT = 6;

// Real, dynamically-computed distances only — nothing here is stored; every
// card's distance is haversine(myCoords, realCoords) run fresh on render, so
// it always reflects wherever the rider currently is (see geo.js).
export default function ExploreNearby({ stops, terminals, myCoords, category, locDenied, onEnableLocation, onDirections }) {
  if (!myCoords) {
    return (
      <div className="explore-section">
        <p className="section-label">Nearby You</p>
        <div className="explore-location-gate">
          <i className="ti ti-map-pin-off"></i>
          <p>Enable location to discover places near you.</p>
          {!locDenied && (
            <button type="button" className="explore-location-gate-button" onClick={onEnableLocation}>
              Enable Location
            </button>
          )}
        </div>
      </div>
    );
  }

  const items = [];
  if (category === "all" || category === "stops") {
    stops.forEach((s) => items.push({
      key: `stop-${s.id}`,
      name: s.name,
      category: "Stop",
      address: "Transit stop",
      distanceKm: haversineDistanceKm(myCoords, s),
      icon: "ti-map-pin-filled",
      stop: s,
    }));
  }
  if (category === "all" || category === "terminals") {
    terminals.forEach((t) => {
      items.push({
        key: `terminal-${t.id}`,
        name: t.name,
        category: "Terminal",
        address: t.location,
        distanceKm: haversineDistanceKm(myCoords, t),
        icon: "ti-bus-stop",
        stop: t.stopId ? stops.find((s) => s.id === t.stopId) : null,
      });
    });
  }
  if (category === "all" || category === "tourist") {
    attractions.forEach((a) => {
      const stop = stops.find((s) => s.id === a.nearestStopId);
      if (!stop) return;
      items.push({
        key: `attraction-${a.id}`,
        name: a.name,
        category: "Tourist Spot",
        address: a.location,
        distanceKm: haversineDistanceKm(myCoords, stop),
        icon: a.icon,
        stop,
      });
    });
  }

  const nearby = items.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, NEARBY_LIMIT);

  return (
    <div className="explore-section">
      <p className="section-label">Nearby You</p>
      {nearby.length === 0 ? (
        <p className="explore-empty-state">No places found nearby.</p>
      ) : (
        <div className="explore-nearby-list">
          {nearby.map((item) => (
            <ExplorePlaceCard
              key={item.key}
              icon={item.icon}
              name={item.name}
              category={item.category}
              address={item.address}
              distanceKm={item.distanceKm}
              onDirections={() => item.stop && onDirections(item.stop)}
              disabled={!item.stop}
            />
          ))}
        </div>
      )}
    </div>
  );
}
