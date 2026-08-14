import { attractions } from "../data/attractions";

export default function TouristSpots({ stops, onSelect }) {
  return (
    <div className="attractions-section">
      <p className="section-label">Famous spots in Cebu</p>
      <div className="attractions-grid">
        {attractions.map((spot) => {
          const stop = stops.find((s) => s.id === spot.nearestStopId);
          return (
            <button
              key={spot.id}
              type="button"
              className="attraction-card"
              onClick={() => stop && onSelect(stop)}
            >
              <div className="attraction-header">
                <div className="attraction-icon">
                  <i className={`ti ${spot.icon}`}></i>
                </div>
                <div>
                  <p className="attraction-name">{spot.name}</p>
                  <p className="attraction-area">{spot.area}</p>
                </div>
              </div>
              <p className="attraction-blurb">{spot.blurb}</p>
              <div className="attraction-footer">
                <div className="attraction-meta">
                  <span className="attraction-meta-label">Ride</span>
                  <span className="attraction-meta-value">{spot.ride}</span>
                </div>
                <div className="attraction-meta">
                  <span className="attraction-meta-label">Fare</span>
                  <span className="attraction-meta-value">{spot.fare}</span>
                </div>
              </div>
              {stop && (
                <div className="attraction-jumpoff">
                  <i className="ti ti-map-pin-bolt"></i>
                  <span>Tap to set <strong>{stop.name}</strong> as your destination</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
