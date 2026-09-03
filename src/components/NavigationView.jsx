import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useTheme from "../hooks/useTheme";
import CameraNavView from "./CameraNavView";
import { haversineDistanceKm, formatDistance, walkingMinutes } from "../utils/geo";
import { openWalkingDirections } from "../utils/navigation";

const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY;
const TILE_URLS = {
  light: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
  dark: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Below this, the rider is considered to have reached the stop — GPS drift
// alone is usually 5-15m, so this has to be looser than "standing on it".
const ARRIVAL_RADIUS_KM = 0.03;
// Re-fetching the OSRM route on every single GPS tick (often every couple of
// meters) would hammer the free public router for no visible benefit — only
// re-route once the rider has actually moved far enough for the old path to
// be stale.
const REROUTE_THRESHOLD_KM = 0.02;

function accentColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--accent-primary").trim() || "#0e9f40";
}

// Full-screen, in-app walking guidance to a single point (a trip's first
// boarding stop, typically) — a live blue dot plus a foot-profile route line
// that re-draws as the rider moves, instead of handing off to an external
// maps app. This app's routing graph only covers the jeepney/bus network
// itself; OSRM's public foot router fills in the "get to the stop" leg,
// same service RouteMap.jsx already relies on for its driving-profile preview.
export default function NavigationView({ destination, onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const myLocationMarkerRef = useRef(null);
  const myLocationAccuracyRef = useRef(null);
  const watchIdRef = useRef(null);
  const hasCenteredRef = useRef(false);
  const userInteractedRef = useRef(false);
  const lastRouteFetchRef = useRef(null);
  const denialCountRef = useRef(0);

  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState("map"); // "map" | "camera" (AR)
  const [myLocation, setMyLocation] = useState(null);
  // locating | granted | denied | blocked | unsupported
  const [locStatus, setLocStatus] = useState("locating");
  const [routeInfo, setRouteInfo] = useState(null); // { distanceKm, etaMinutes }
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true })
      .setView([destination.lat, destination.lon], 16);
    mapRef.current = map;

    destMarkerRef.current = L.marker([destination.lat, destination.lon]).addTo(map).bindPopup(destination.name);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    const onDragStart = () => { userInteractedRef.current = true; };
    map.on("dragstart", onDragStart);

    return () => {
      ro.disconnect();
      map.off("dragstart", onDragStart);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(TILE_URLS[theme] || TILE_URLS.light, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
    if (routeLayerRef.current) routeLayerRef.current.setStyle({ color: accentColor() });
  }, [theme]);

  function centerOn(lat, lon) {
    const map = mapRef.current;
    if (!map) return;
    userInteractedRef.current = false;
    map.panTo([lat, lon]);
  }

  // Live GPS tracking — same watchPosition pattern as MapExplorer's "My
  // Location" dot, just driving a route re-fetch too instead of only a marker.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus("unsupported");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        denialCountRef.current = 0;
        const { latitude, longitude, accuracy } = pos.coords;
        setMyLocation({ lat: latitude, lon: longitude, accuracy });
        setLocStatus("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) denialCountRef.current += 1;
        setLocStatus(denialCountRef.current >= 2 ? "blocked" : "denied");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Blue dot + accuracy halo, identical visual language to MapExplorer.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !myLocation) return;
    const latlng = [myLocation.lat, myLocation.lon];

    if (!myLocationMarkerRef.current) {
      const icon = L.divIcon({
        className: "my-location-icon-wrapper",
        html: '<div class="my-location-pulse"></div><div class="my-location-dot"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      myLocationMarkerRef.current = L.marker(latlng, { icon, interactive: false, zIndexOffset: 1000 }).addTo(map);
    } else {
      myLocationMarkerRef.current.setLatLng(latlng);
    }

    if (!myLocationAccuracyRef.current) {
      myLocationAccuracyRef.current = L.circle(latlng, {
        radius: myLocation.accuracy,
        color: "#1a73e8",
        weight: 1,
        opacity: 0.25,
        fillColor: "#1a73e8",
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map);
    } else {
      myLocationAccuracyRef.current.setLatLng(latlng);
      myLocationAccuracyRef.current.setRadius(myLocation.accuracy);
    }

    if (!hasCenteredRef.current) {
      hasCenteredRef.current = true;
      map.fitBounds([latlng, [destination.lat, destination.lon]], { padding: [60, 60] });
    } else if (!userInteractedRef.current) {
      centerOn(myLocation.lat, myLocation.lon);
    }

    const straightLineKm = haversineDistanceKm(myLocation, destination);
    setArrived(straightLineKm <= ARRIVAL_RADIUS_KM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLocation]);

  // Re-draw the foot-profile walking route whenever the rider has moved far
  // enough from where it was last fetched (or on the very first fix).
  useEffect(() => {
    if (!myLocation || arrived) return;
    const last = lastRouteFetchRef.current;
    if (last && haversineDistanceKm(last, myLocation) < REROUTE_THRESHOLD_KM) return;

    let cancelled = false;
    lastRouteFetchRef.current = { lat: myLocation.lat, lon: myLocation.lon };

    (async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${myLocation.lon},${myLocation.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled || data.code !== "Ok" || !data.routes?.length) return;

        const map = mapRef.current;
        const leg = data.routes[0];
        const latLngs = leg.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = L.polyline(latLngs, { color: accentColor(), weight: 5, opacity: 0.9 }).addTo(map);

        setRouteInfo({
          distanceKm: leg.distance / 1000,
          etaMinutes: Math.max(1, Math.round(leg.duration / 60)),
        });
      } catch {
        // Fall back to the straight-line estimate already shown; the route
        // line just won't update this tick.
        if (!cancelled) {
          const km = haversineDistanceKm(myLocation, destination);
          setRouteInfo({ distanceKm: km, etaMinutes: walkingMinutes(km) });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [myLocation, arrived, destination]);

  function retryLocation() {
    setLocStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        denialCountRef.current = 0;
        setMyLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocStatus("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) denialCountRef.current += 1;
        setLocStatus(denialCountRef.current >= 2 ? "blocked" : "denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="nav-view">
      <div className="nav-view-topbar">
        <button type="button" className="nav-view-close" onClick={onClose}>
          <i className="ti ti-x"></i>
        </button>
        <div className="nav-view-title">
          <p className="nav-view-title-label">Walking to</p>
          <p className="nav-view-title-name">{destination.name}</p>
        </div>
        <button
          type="button"
          className="nav-view-mode-toggle"
          onClick={() => setViewMode((m) => (m === "map" ? "camera" : "map"))}
          title={viewMode === "map" ? "Switch to AR camera view" : "Switch to map view"}
        >
          <i className={`ti ${viewMode === "map" ? "ti-camera" : "ti-map-2"}`}></i>
        </button>
      </div>

      {viewMode === "camera" && (
        <CameraNavView
          myLocation={myLocation}
          destination={destination}
          distanceKm={routeInfo?.distanceKm}
        />
      )}

      {/* Kept mounted (just hidden) rather than unmounted when the camera
          view is active — the Leaflet map instance and GPS-driven effects
          above are set up once on mount, not re-created on view-mode
          toggles, so tearing this div down would orphan them. */}
      <div className="nav-view-map-wrap" style={viewMode === "camera" ? { display: "none" } : undefined}>
        <div className="nav-view-map" ref={containerRef} />

        {myLocation && (
          <button
            type="button"
            className="my-location-button nav-view-recenter"
            onClick={() => centerOn(myLocation.lat, myLocation.lon)}
            title="Recenter on me"
          >
            <i className="ti ti-current-location"></i>
          </button>
        )}

        {(locStatus === "denied" || locStatus === "blocked" || locStatus === "unsupported") && (
          <div className="my-location-banner nav-view-banner">
            <i className="ti ti-map-pin-off"></i>
            <div className="my-location-banner-text">
              <span>Location access is off</span>
              <small>
                {locStatus === "unsupported"
                  ? "This device doesn't support live location."
                  : locStatus === "blocked"
                    ? "Enable location for this site in your browser settings."
                    : "Turn on location to see live turn-by-turn guidance."}
              </small>
            </div>
            {locStatus === "denied" && (
              <button type="button" onClick={retryLocation}>Enable</button>
            )}
          </div>
        )}
      </div>

      {arrived ? (
        <div className="nav-view-bottom nav-view-arrived">
          <i className="ti ti-flag-3"></i>
          <div className="nav-view-bottom-text">
            <p className="nav-view-bottom-title">You've arrived</p>
            <p className="nav-view-bottom-sub">{destination.name}</p>
          </div>
          <button type="button" className="nav-view-done" onClick={onClose}>Done</button>
        </div>
      ) : (
        <div className="nav-view-bottom">
          <div className="nav-view-stat">
            <p className="nav-view-stat-value">
              {routeInfo ? formatDistance(routeInfo.distanceKm) : locStatus === "locating" ? "…" : "--"}
            </p>
            <p className="nav-view-stat-label">Distance</p>
          </div>
          <div className="nav-view-stat-divider" />
          <div className="nav-view-stat">
            <p className="nav-view-stat-value">
              {routeInfo ? `${routeInfo.etaMinutes} min` : locStatus === "locating" ? "…" : "--"}
            </p>
            <p className="nav-view-stat-label">Walk time</p>
          </div>
          <button
            type="button"
            className="nav-view-external"
            onClick={() => openWalkingDirections(destination.lat, destination.lon)}
            title="Open in Google Maps instead"
          >
            <i className="ti ti-external-link"></i>
          </button>
        </div>
      )}
    </div>
  );
}
