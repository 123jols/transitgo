import { attractions } from "../data/attractions";
import useWikiThumbnail from "../hooks/useWikiThumbnail";
import { haversineDistanceKm, formatDistance } from "../utils/geo";

function AttractionCard({ spot, stops, myCoords, onViewRoute, index }) {
  const { url: photoUrl, loading } = useWikiThumbnail(spot.wikiTitle);
  const stop = stops.find((s) => s.id === spot.nearestStopId);
  // No lat/lon of its own — distance is to the real jump-off stop the trip
  // actually routes through, not the attraction's exact doorstep.
  const distanceKm = myCoords && stop ? haversineDistanceKm(myCoords, stop) : null;

  return (
    <div className="attraction-card explore-card-in" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <div className="attraction-photo">
        {photoUrl ? (
          <img src={photoUrl} alt={spot.name} loading="lazy" />
        ) : loading ? (
          <div className="attraction-photo-skeleton" />
        ) : (
          <i className={`ti ${spot.icon}`}></i>
        )}
      </div>
      <div className="attraction-body">
        <div className="attraction-name-row">
          <p className="attraction-name">{spot.name}</p>
          {distanceKm != null && <span className="attraction-distance">{formatDistance(distanceKm)}</span>}
        </div>
        <div className="attraction-meta">
          <p className="attraction-location">
            <i className="ti ti-map-pin"></i> {spot.location}
          </p>
          {spot.category && <span className="attraction-category-tag">{spot.category}</span>}
        </div>
        <p className="attraction-description">{spot.description}</p>
        <button
          type="button"
          className="attraction-route-button"
          onClick={() => stop && onViewRoute(stop)}
          disabled={!stop}
        >
          <i className="ti ti-route"></i>
          Get Directions
        </button>
      </div>
    </div>
  );
}

export default function TouristSpots({ spots = attractions, stops, myCoords, onSelect }) {
  return (
    <div className="attractions-section">
      <p className="section-label">Explore Cebu</p>
      <p className="attractions-section-subtitle">Discover places worth visiting.</p>
      {spots.length === 0 ? (
        <p className="explore-empty-state">No places found in this category.</p>
      ) : (
        <div className="attractions-grid">
          {spots.map((spot, i) => (
            <AttractionCard key={spot.id} spot={spot} stops={stops} myCoords={myCoords} onViewRoute={onSelect} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
