import { useEffect, useState } from "react";
import { terminals } from "../data/terminals";
import { haversineDistanceKm, formatDistance } from "../utils/geo";

export default function TerminalsPage({ stops, onViewRoutes }) {
  const [userLoc, setUserLoc] = useState(null);
  const [locStatus, setLocStatus] = useState("idle"); // idle | locating | ok | denied

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus("denied");
      return;
    }
    setLocStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocStatus("ok");
      },
      () => setLocStatus("denied"),
      { timeout: 6000 }
    );
  }, []);

  const sortedTerminals = userLoc
    ? [...terminals]
        .map((terminal) => ({ ...terminal, distanceKm: haversineDistanceKm(userLoc, terminal) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : terminals;

  const handleViewRoutes = (terminal) => {
    if (!terminal.stopId) return;
    const stop = stops.find((s) => s.id === terminal.stopId);
    if (stop) onViewRoutes(stop);
  };

  return (
    <div className="static-page">
      <div className="terminals-page-header">
        <h2 className="route-label">Cebu Terminals</h2>
        <p className="terminals-page-subtitle">Find terminals and transport hubs around Cebu</p>
      </div>

      {locStatus === "locating" && <p className="terminals-hint">Finding terminals near you…</p>}

      <div className="terminal-cards">
        {sortedTerminals.map((terminal) => (
          <div key={terminal.id} className="terminal-card">
            <div className="terminal-card-header">
              <div className="terminal-card-icon">
                <i className="ti ti-bus-stop"></i>
              </div>
              <div className="terminal-card-title">
                <p className="terminal-card-name">{terminal.name}</p>
                <p className="terminal-card-location">
                  <i className="ti ti-map-pin"></i> {terminal.location}
                </p>
              </div>
              {terminal.distanceKm !== undefined && (
                <span className="terminal-card-distance">{formatDistance(terminal.distanceKm)}</span>
              )}
            </div>

            <div className="terminal-card-routes">
              {terminal.routes.map((route) => (
                <span key={route} className="terminal-route-badge">{route}</span>
              ))}
            </div>

            {terminal.hours && (
              <div className={`terminal-card-hours${terminal.longRoute ? " terminal-card-hours-long" : ""}`}>
                <div className="terminal-card-hours-row">
                  <i className="ti ti-clock"></i>
                  <span>
                    First ride <strong>{terminal.hours.first}</strong> · Last ride{" "}
                    <strong>{terminal.hours.last}</strong>
                    {!terminal.hours.sourced && <em className="terminal-card-hours-unconfirmed"> (est.)</em>}
                  </span>
                  {terminal.longRoute && (
                    <span className="terminal-card-hours-tag">Long route — plan ahead</span>
                  )}
                </div>
                {terminal.hours.note && <p className="terminal-card-hours-note">{terminal.hours.note}</p>}
              </div>
            )}

            <button
              type="button"
              className="attraction-route-button"
              onClick={() => handleViewRoutes(terminal)}
              disabled={!terminal.stopId}
            >
              <i className="ti ti-route"></i>
              View Routes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
