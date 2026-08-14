import { attractions } from "../data/attractions";
import useWikiThumbnail from "../hooks/useWikiThumbnail";

function AttractionCard({ spot, stops, onViewRoute }) {
  const photoUrl = useWikiThumbnail(spot.wikiTitle);
  const stop = stops.find((s) => s.id === spot.nearestStopId);

  return (
    <div className="attraction-card">
      <div className="attraction-photo">
        {photoUrl ? (
          <img src={photoUrl} alt={spot.name} loading="lazy" />
        ) : (
          <i className={`ti ${spot.icon}`}></i>
        )}
      </div>
      <div className="attraction-body">
        <p className="attraction-name">{spot.name}</p>
        <p className="attraction-location">
          <i className="ti ti-map-pin"></i> {spot.location}
        </p>
        <p className="attraction-description">{spot.description}</p>
        <button
          type="button"
          className="attraction-route-button"
          onClick={() => stop && onViewRoute(stop)}
          disabled={!stop}
        >
          <i className="ti ti-route"></i>
          View Route
        </button>
      </div>
    </div>
  );
}

export default function TouristSpots({ stops, onSelect }) {
  return (
    <div className="attractions-section">
      <p className="section-label">Famous Spots in Cebu</p>
      <div className="attractions-grid">
        {attractions.map((spot) => (
          <AttractionCard key={spot.id} spot={spot} stops={stops} onViewRoute={onSelect} />
        ))}
      </div>
    </div>
  );
}
