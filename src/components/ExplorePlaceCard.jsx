import { formatDistance } from "../utils/geo";

// Shared row card for Explore's browsing sections (Nearby You, Transportation
// Hubs, search results) — one presentational component instead of three
// near-identical card renderers, all built on the same visual language as
// TerminalsPage's existing `.terminal-card`.
export default function ExplorePlaceCard({ icon, name, category, address, distanceKm, onDirections, disabled }) {
  return (
    <div className="terminal-card explore-place-card">
      <div className="terminal-card-header">
        <div className="terminal-card-icon">
          <i className={`ti ${icon || "ti-map-pin"}`}></i>
        </div>
        <div className="terminal-card-title">
          <p className="terminal-card-name">{name}</p>
          <p className="terminal-card-location">
            <i className="ti ti-map-pin"></i> {address}
          </p>
        </div>
        {distanceKm != null && (
          <span className="terminal-card-distance">{formatDistance(distanceKm)}</span>
        )}
      </div>
      <div className="explore-place-card-footer">
        {category && <span className="attraction-category-tag">{category}</span>}
        <button
          type="button"
          className="explore-place-directions"
          onClick={onDirections}
          disabled={disabled}
        >
          <i className="ti ti-route"></i>
          Directions
        </button>
      </div>
    </div>
  );
}
