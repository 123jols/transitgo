import { formatDistance } from "../utils/geo";

// Shared row for Explore's browsing sections (Nearby You, Transportation
// Hubs, search results) — a single clean list row instead of a card stacked
// with a separate footer button, so the row itself is the tap target.
export default function ExplorePlaceCard({ icon, name, category, address, distanceKm, onDirections, disabled }) {
  const metaParts = [category, address].filter(Boolean);

  return (
    <button type="button" className="place-card" onClick={onDirections} disabled={disabled}>
      <span className="place-card-icon">
        <i className={`ti ${icon || "ti-map-pin"}`}></i>
      </span>
      <span className="place-card-body">
        <span className="place-card-name">{name}</span>
        {metaParts.length > 0 && (
          <span className="place-card-meta">
            {metaParts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span className="place-card-dot">·</span>}
                {part}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="place-card-side">
        {distanceKm != null && <span className="place-card-distance">{formatDistance(distanceKm)}</span>}
        <i className="ti ti-chevron-right place-card-chevron"></i>
      </span>
    </button>
  );
}
