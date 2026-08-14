import { useEffect, useState } from "react";
import { haversineDistanceKm } from "../utils/geo";

export default function NearbyTerminals({ stops, onSelect }) {
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

  const ranked = userLoc
    ? [...stops]
        .map((stop) => ({ stop, distanceKm: haversineDistanceKm(userLoc, stop) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : stops.map((stop) => ({ stop, distanceKm: null }));

  const nearest = userLoc ? ranked[0] : null;

  return (
    <div className="terminals-section">
      <p className="section-label">Terminals</p>

      {nearest && (
        <button
          type="button"
          className="nearest-terminal-card"
          onClick={() => onSelect(nearest.stop)}
        >
          <div className="nearest-terminal-icon">
            <i className="ti ti-current-location"></i>
          </div>
          <div className="nearest-terminal-text">
            <p className="nearest-terminal-label">Nearest to you</p>
            <p className="nearest-terminal-name">
              {nearest.stop.name} · {nearest.distanceKm.toFixed(1)} km away
            </p>
          </div>
          <i className="ti ti-chevron-right"></i>
        </button>
      )}

      {locStatus === "locating" && (
        <p className="terminals-hint">Finding terminals near you…</p>
      )}
      {locStatus === "denied" && (
        <p className="terminals-hint">Turn on location to see the terminal nearest you.</p>
      )}

      <div className="terminals-scroll-wrapper">
        <div className="terminals-scroll">
          {ranked.map(({ stop, distanceKm }) => (
            <button
              key={stop.id}
              type="button"
              className="terminal-chip"
              onClick={() => onSelect(stop)}
            >
              <i className="ti ti-map-pin"></i>
              <span>{stop.name}</span>
              {distanceKm !== null && <span className="terminal-chip-distance">{distanceKm.toFixed(1)} km</span>}
            </button>
          ))}
        </div>
        <div className="chips-fade" aria-hidden="true"></div>
      </div>
    </div>
  );
}
