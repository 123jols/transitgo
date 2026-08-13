import RouteMap from "../components/RouteMap";
import ThemeToggle from "../components/ThemeToggle";
import { haversineDistanceKm } from "../utils/geo";

const VEHICLE_ICON = {
  jeepney: "ti-bus",
  bus: "ti-bus",
  walk: "ti-walk",
};

export default function RouteDetailsPage({
  route,
  from,
  to,
  userType,
  discountRate,
  userLabel,
  onBack,
}) {
  const discountedFare = Math.round(route.fare * (1 - discountRate));
  const savings = route.fare - discountedFare;
  const stops = route.stops || [from.name, to.name];
  const directDistanceKm = Number.isFinite(from?.lat) && Number.isFinite(to?.lat)
    ? haversineDistanceKm(from, to).toFixed(1)
    : null;
  const vehicleIcon = VEHICLE_ICON[route.type] || "ti-bus";
  const aiInsight = discountRate > 0
    ? `Smart pick for ${userLabel} riders: this route maximizes your savings with excellent timing and minimal transfers.`
    : route.transfers === 0
      ? "Direct route with zero transfers — the fastest path from start to destination."
      : "A balanced route that delivers strong value across cost, time, and convenience.";

  return (
    <div className="route-details-container">
      <div className="route-details-card">
        {/* Back button */}
        <div className="route-details-header">
          <button type="button" className="back-button" onClick={onBack}>
            <i className="ti ti-arrow-left"></i>
            <span>Back to results</span>
          </button>
          <ThemeToggle />
        </div>

        {/* Route title and type */}
        <div style={{ display: "grid", gap: "10px" }}>
          <h2 className="route-label">{route.label}</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span className="route-type-badge">{route.type}</span>
            <span style={{ fontSize: "12px", color: "#8695ab" }}>
              {from.name} → {to.name}
            </span>
          </div>
        </div>

        {/* Route map */}
        <RouteMap from={from} to={to} />
        {directDistanceKm && (
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: -12 }}>
            ~{directDistanceKm} km direct distance
          </p>
        )}

        {/* Journey steps */}
        <div className="journey-steps">
          <div className="journey-step">
            <div className="journey-step-icon"><i className="ti ti-map-pin"></i></div>
            <div className="journey-step-text">
              <p className="journey-step-title">Board at {from.name}</p>
            </div>
          </div>

          {(route.legs && route.legs.length > 0 ? route.legs : [{
            kind: "ride", code: route.type, toName: to.name, duration: route.duration, fare: route.fare,
          }]).map((leg, i) => (
            <div className="journey-step" key={i}>
              <div className="journey-step-icon">
                <i className={`ti ${leg.kind === "walk" ? "ti-walk" : vehicleIcon}`}></i>
              </div>
              <div className="journey-step-text">
                <p className="journey-step-title">
                  {leg.kind === "walk" ? `Walk to ${leg.toName}` : `${leg.code} to ${leg.toName}`}
                </p>
                <p className="journey-step-meta">
                  {leg.kind === "walk"
                    ? `${leg.duration} min walk`
                    : `${leg.duration} min${leg.fare ? ` · ₱${leg.fare}` : ""}`}
                </p>
              </div>
            </div>
          ))}

          <div className="journey-step">
            <div className="journey-step-icon journey-step-icon-end"><i className="ti ti-flag"></i></div>
            <div className="journey-step-text">
              <p className="journey-step-title">Arrive at {to.name}</p>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="ai-insight-card">
          <p className="ai-insight-label">AI Insight</p>
          <p className="ai-insight-text">{aiInsight}</p>
        </div>

        {/* Key details grid */}
        <div className="detail-grid">
          <div className="detail-card">
            <p className="detail-label">Fare</p>
            <p className="detail-value">₱{discountedFare}</p>
            {discountRate > 0 && (
              <p className="detail-copy" style={{ color: "#2e7d32", fontSize: "11px", marginTop: "4px" }}>
                Save ₱{savings}
              </p>
            )}
          </div>
          <div className="detail-card">
            <p className="detail-label">Duration</p>
            <p className="detail-value">{route.duration} min</p>
          </div>
          <div className="detail-card">
            <p className="detail-label">Transfers</p>
            <p className="detail-value">{route.transfers}</p>
          </div>
          <div className="detail-card">
            <p className="detail-label">Rider Type</p>
            <p className="detail-value">{userLabel}</p>
          </div>
        </div>

        {/* Extra info cards */}
        <div style={{ display: "grid", gap: "12px" }}>
          <div className="detail-card">
            <p className="detail-label">From</p>
            <p className="detail-value">{from.name}</p>
            <p className="detail-copy">Your departure point</p>
          </div>
          <div className="detail-card">
            <p className="detail-label">To</p>
            <p className="detail-value">{to.name}</p>
            <p className="detail-copy">Your destination</p>
          </div>

          {/* Stops list */}
          <div className="detail-card">
            <p className="detail-label">Stops along the route</p>
            <ul className="stops-list">
              {stops.map((stop, index) => (
                <li key={`${stop}-${index}`}>
                  <span>{index + 1}.</span>
                  <span>{stop}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="detail-card">
            <p className="detail-label">Tips</p>
            <p className="detail-copy">
              {route.type === "walk" 
                ? "Perfect for short distances. Wear comfortable shoes and check the weather."
                : route.transfers > 1
                ? "This route has multiple transfers. Plan extra time at transfer points and keep change handy."
                : "A straightforward route with minimal stops. Have your fare ready for quick boarding."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
