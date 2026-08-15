import { useMemo } from "react";
import { nearestTerminals, DEFAULT_TERMINAL_RADIUS_KM } from "../data/terminals";
import { bestTerminalFor } from "../utils/routing";
import { formatDistance, walkingMinutes } from "../utils/geo";
import FareEtaCard from "./FareEtaCard";

// Shown below the "From" field whenever it's genuinely GPS-driven (see
// HomePage.jsx's autoLocateRef gating) — surfaces terminal-aware info the
// existing stop-based origin resolution doesn't express on its own.
//
// `destination`'s "best terminal for this trip" block is informational
// only: it never changes what HomePage.jsx actually searches (`from` stays
// whatever nearestStop already resolved to, which correctly includes stops
// that aren't terminals at all) — see routing.js's bestTerminalFor for why
// restricting real search to terminals-only would be a regression.
export default function NearbyTerminalsCard({ userLocation, destination, onViewAllTerminals }) {
  const nearby = useMemo(
    () => (userLocation ? nearestTerminals(userLocation.lat, userLocation.lon) : null),
    [userLocation]
  );

  const best = useMemo(
    () => (userLocation && destination ? bestTerminalFor(userLocation, destination.id) : null),
    [userLocation, destination]
  );

  if (!userLocation || !nearby?.nearest) return null;

  const { nearest, nearby: otherNearby, inRadius } = nearby;
  const nearestWalkMin = walkingMinutes(nearest.distanceKm);

  return (
    <div className="nearby-terminals-section">
      <div className="terminal-card">
        <div className="terminal-card-header">
          <div className="terminal-card-icon">
            <i className="ti ti-bus-stop"></i>
          </div>
          <div className="terminal-card-title">
            <p className="terminal-card-name">{nearest.name}</p>
            <p className="terminal-card-location">
              <i className="ti ti-walk"></i>{" "}
              {inRadius
                ? `${formatDistance(nearest.distanceKm)} away · ${nearestWalkMin}-minute walk`
                : `No terminal within ${formatDistance(DEFAULT_TERMINAL_RADIUS_KM)} — nearest is ${formatDistance(nearest.distanceKm)}, a ${nearestWalkMin}-minute walk`}
            </p>
          </div>
        </div>

        <div className="terminal-card-routes">
          {nearest.routes.map((route) => (
            <span key={route} className="terminal-route-badge">{route}</span>
          ))}
        </div>
      </div>

      {otherNearby.length > 0 && (
        <div className="nearby-terminal-list">
          {otherNearby.slice(0, 3).map((terminal) => (
            <div key={terminal.id} className="nearby-terminal-row">
              <i className="ti ti-bus-stop"></i>
              <div className="nearby-terminal-row-text">
                <p className="nearby-terminal-row-name">{terminal.name}</p>
                <p className="nearby-terminal-row-meta">
                  {formatDistance(terminal.distanceKm)} · {walkingMinutes(terminal.distanceKm)}-min walk
                </p>
              </div>
              <div className="nearby-terminal-row-routes">
                {terminal.routes.slice(0, 2).map((route) => (
                  <span key={route} className="terminal-route-badge">{route}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="nearby-terminals-view-all" onClick={onViewAllTerminals}>
        See all terminals
      </button>

      {best && (
        <div className="nearby-terminals-best">
          <p className="nearby-terminals-best-label">
            Best terminal for this trip: <strong>{best.terminal.name}</strong>
          </p>
          <FareEtaCard trip={best.trip} syntheticWalkMinutes={walkingMinutes(best.distanceKm)} />
        </div>
      )}
    </div>
  );
}
