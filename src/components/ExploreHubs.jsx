import { haversineDistanceKm, formatDistance } from "../utils/geo";

// "Transportation Hubs" — the full terminal directory (not capped to a
// nearby radius the way ExploreNearby is), sorted by distance when a fix is
// available. Links out to the existing dedicated Terminals tab for the full
// TerminalsPage experience (routes, hours) rather than re-building that card
// a second time here.
export default function ExploreHubs({ stops, terminals, myCoords, onDirections, onViewAll }) {
  const sorted = myCoords
    ? [...terminals].sort((a, b) => haversineDistanceKm(myCoords, a) - haversineDistanceKm(myCoords, b))
    : terminals;

  return (
    <div className="explore-section">
      <div className="explore-section-header-row">
        <p className="section-label">Transportation Hubs</p>
        <button type="button" className="explore-see-all" onClick={onViewAll}>
          See all <i className="ti ti-chevron-right"></i>
        </button>
      </div>
      <div className="chips-scroll-wrapper">
        <div className="chips-scroll explore-hubs-scroll">
          {sorted.map((t) => {
            const distanceKm = myCoords ? haversineDistanceKm(myCoords, t) : null;
            return (
              <button
                key={t.id}
                type="button"
                className="explore-hub-tile"
                onClick={() => t.stopId && onDirections(stops.find((s) => s.id === t.stopId))}
                disabled={!t.stopId}
              >
                <span className="explore-hub-tile-icon"><i className="ti ti-bus-stop"></i></span>
                <span className="explore-hub-tile-name">{t.name}</span>
                {distanceKm != null && <span className="explore-hub-tile-distance">{formatDistance(distanceKm)}</span>}
              </button>
            );
          })}
        </div>
        <div className="chips-fade" aria-hidden="true"></div>
      </div>
    </div>
  );
}
