import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useTheme from "../hooks/useTheme";
import { stops } from "../data/db";
import { findRoutesBetween, nearestStop, findNearbyRoutes } from "../utils/routing";
import { haversineDistanceKm } from "../utils/geo";
import { assembleTripGeometry } from "../utils/routeGeometry";
import FareEtaCard from "./FareEtaCard";

const CEBU_CENTER = { lat: 10.3157, lon: 123.8854 };
const DEFAULT_ZOOM = 14;
// "Are we in Cebu at all" coverage check — matches HomePage.jsx's
// MAX_AUTO_LOCATE_KM precedent, not the tighter nearby-routes radius below.
const MAX_LOCATE_KM = 20;
// Re-hitting findNearbyRoutes/findRoutesBetween on every watchPosition tick
// would flicker the chip lists for no reason — only recompute once the
// rider has actually moved, matching HomePage.jsx's MIN_REGEOCODE_MOVE_KM.
const MIN_MOVE_KM_FOR_RECOMPUTE = 0.05; // ~50m

const TILE_URLS = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Icons for the destination-marker pin, keyed off the real `type` values
// used in data/db.js (business/mall/landmark/district) — not invented
// terminal/school/airport types the current stop graph doesn't actually have.
const TYPE_ICON = {
  business: "ti-building",
  mall: "ti-building-store",
  landmark: "ti-map-pin",
  district: "ti-map-2",
};

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function describeGeoError(err) {
  if (!err || typeof err.code !== "number") return "Couldn't determine your location.";
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location access is off.";
    case err.POSITION_UNAVAILABLE:
      return "Couldn't get a GPS fix.";
    case err.TIMEOUT:
      return "Getting your location took too long.";
    default:
      return "Couldn't determine your location.";
  }
}

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

function segmentColor(segment) {
  if (segment.kind === "walk") return cssVar("--accent-walk", "#6b7280");
  if (segment.type === "bus") return cssVar("--accent-bus", "#2a78d6");
  return cssVar("--accent-primary", "#0e9f40");
}

export default function AiChatMap() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const myLocationMarkerRef = useRef(null);
  const myLocationAccuracyRef = useRef(null);
  const destMarkerRef = useRef(null);
  const segmentLayersRef = useRef([]);
  const transferMarkersRef = useRef([]);
  const nearbyLayersRef = useRef({});
  const hasCenteredRef = useRef(false);
  const userInteractedRef = useRef(false);
  const lastNearbyFixRef = useRef(null);
  const lastTripFixRef = useRef(null);
  const tripOkRef = useRef(false);

  const { theme } = useTheme();
  const [myLocation, setMyLocation] = useState(null);
  const [locStatus, setLocStatus] = useState("idle"); // idle | locating | granted | denied | unsupported
  const [locError, setLocError] = useState("");
  const [nearby, setNearby] = useState({ routes: [], fallbackStops: [] });
  const [selectedNearbyCode, setSelectedNearbyCode] = useState(null);
  const [dest, setDest] = useState(null);
  const [trip, setTrip] = useState(null);
  const [geometry, setGeometry] = useState(null);
  const [routeError, setRouteError] = useState("");

  // Map init — mount-only.
  useEffect(() => {
    const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(
      [CEBU_CENTER.lat, CEBU_CENTER.lon],
      DEFAULT_ZOOM
    );
    mapRef.current = map;

    // Same fix MapExplorer.jsx uses: the popup's flex layout doesn't always
    // settle the container's real size before L.map() runs.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapContainerRef.current);

    const onDragStart = () => { userInteractedRef.current = true; };
    map.on("dragstart", onDragStart);

    return () => {
      ro.disconnect();
      map.off("dragstart", onDragStart);
      map.remove();
    };
  }, []);

  // Tile layer per theme.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(TILE_URLS[theme] || TILE_URLS.light, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
  }, [theme]);

  // Continuous GPS watch — mount-only, cleared on unmount (i.e. when the
  // rider closes the map panel), so permission is only requested once the
  // map is actually opened and tracking stops the instant it's closed.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus("unsupported");
      return;
    }
    setLocStatus("locating");
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setMyLocation({ lat: latitude, lon: longitude, accuracy });
        setLocStatus("granted");
      },
      (err) => {
        setLocStatus("denied");
        setLocError(describeGeoError(err));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Blue dot + accuracy halo, and one-time auto-center on the first fix
  // (never again once the rider has dragged the map themselves).
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

    if (!hasCenteredRef.current && !userInteractedRef.current) {
      hasCenteredRef.current = true;
      map.setView(latlng, Math.max(map.getZoom(), DEFAULT_ZOOM));
    }
  }, [myLocation]);

  // Throttled "nearby routes" recompute.
  useEffect(() => {
    if (!myLocation) return;
    const last = lastNearbyFixRef.current;
    if (last && haversineDistanceKm(last, myLocation) < MIN_MOVE_KM_FOR_RECOMPUTE) return;
    lastNearbyFixRef.current = { lat: myLocation.lat, lon: myLocation.lon };
    setNearby(findNearbyRoutes(myLocation.lat, myLocation.lon));
  }, [myLocation]);

  // Draw nearby-route polylines (dim by default, highlighted when tapped).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(nearbyLayersRef.current).forEach((layer) => map.removeLayer(layer));
    nearbyLayersRef.current = {};

    nearby.routes.forEach(({ route, code }) => {
      const latlngs = route.stopIds
        .map((id) => stops.find((s) => s.id === id))
        .filter(Boolean)
        .map((s) => [s.lat, s.lon]);
      if (latlngs.length < 2) return;
      const isSelected = code === selectedNearbyCode;
      const color = route.type === "bus" ? cssVar("--accent-bus", "#2a78d6") : cssVar("--accent-primary", "#0e9f40");
      const layer = L.polyline(latlngs, {
        color,
        weight: isSelected ? 5 : 3,
        opacity: isSelected ? 0.95 : 0.4,
      }).addTo(map);
      nearbyLayersRef.current[code] = layer;
    });
  }, [nearby, selectedNearbyCode, theme]);

  // Destination marker, type-aware icon.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }
    if (!dest) return;
    const iconClass = TYPE_ICON[dest.type] || "ti-map-pin";
    const icon = L.divIcon({
      className: "ai-chat-map-dest-icon-wrapper",
      html: `<div class="ai-chat-map-dest-pin"><i class="ti ${iconClass}"></i></div>`,
      iconSize: [30, 34],
      iconAnchor: [15, 32],
    });
    destMarkerRef.current = L.marker([dest.lat, dest.lon], { icon }).addTo(map).bindPopup(dest.name);
  }, [dest]);

  // Recompute the recommended trip (throttled) whenever the destination or
  // the rider's position meaningfully changes.
  useEffect(() => {
    if (!dest) {
      setTrip(null);
      setGeometry(null);
      setRouteError("");
      tripOkRef.current = false;
      lastTripFixRef.current = null;
      return;
    }
    if (!myLocation) {
      setTrip(null);
      setGeometry(null);
      setRouteError("Enable location to see a route from here.");
      tripOkRef.current = false;
      return;
    }

    const last = lastTripFixRef.current;
    if (last && tripOkRef.current && haversineDistanceKm(last, myLocation) < MIN_MOVE_KM_FOR_RECOMPUTE) return;
    lastTripFixRef.current = { lat: myLocation.lat, lon: myLocation.lon };

    const origin = nearestStop(myLocation.lat, myLocation.lon, MAX_LOCATE_KM);
    if (!origin) {
      setRouteError("You're outside TransitGo's covered area.");
      setTrip(null);
      setGeometry(null);
      tripOkRef.current = false;
      return;
    }
    if (origin.id === dest.id) {
      setRouteError("You're already there!");
      setTrip(null);
      setGeometry(null);
      tripOkRef.current = false;
      return;
    }
    const best = findRoutesBetween(origin.id, dest.id)[0] || null;
    if (!best) {
      setRouteError("No route found to this destination yet.");
      setTrip(null);
      setGeometry(null);
      tripOkRef.current = false;
      return;
    }

    setRouteError("");
    setTrip(best);
    setGeometry(assembleTripGeometry(best, myLocation, dest));
    tripOkRef.current = true;
  }, [dest, myLocation]);

  // Draw the recommended route's colored segments + transfer markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    segmentLayersRef.current.forEach((layer) => map.removeLayer(layer));
    segmentLayersRef.current = [];
    transferMarkersRef.current.forEach((marker) => map.removeLayer(marker));
    transferMarkersRef.current = [];
    if (!geometry) return;

    geometry.segments.forEach((segment) => {
      const isWalk = segment.kind === "walk";
      const layer = L.polyline(segment.latlngs, {
        color: segmentColor(segment),
        weight: isWalk ? 4 : 5,
        opacity: 0.9,
        dashArray: isWalk ? "6, 6" : null,
        className: "ai-chat-map-route-line",
      }).addTo(map);
      segmentLayersRef.current.push(layer);
    });

    geometry.transferPoints.forEach((stop) => {
      const icon = L.divIcon({
        className: "ai-chat-map-transfer-icon-wrapper",
        html: '<div class="ai-chat-map-transfer-dot"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      transferMarkersRef.current.push(L.marker([stop.lat, stop.lon], { icon, interactive: false }).addTo(map));
    });

    const allPoints = geometry.segments.flatMap((s) => s.latlngs);
    if (allPoints.length) map.fitBounds(allPoints, { padding: [28, 28], maxZoom: 16 });
  }, [geometry, theme]);

  function recenter() {
    if (myLocation) {
      userInteractedRef.current = false;
      const map = mapRef.current;
      if (map) map.setView([myLocation.lat, myLocation.lon], Math.max(map.getZoom(), DEFAULT_ZOOM));
      return;
    }
    if (!navigator.geolocation) return;
    setLocStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setMyLocation({ lat: latitude, lon: longitude, accuracy });
        setLocStatus("granted");
      },
      (err) => {
        setLocStatus("denied");
        setLocError(describeGeoError(err));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function tapNearbyRoute(code) {
    setSelectedNearbyCode((prev) => (prev === code ? null : code));
  }

  function tapDestination(stop) {
    setDest((prev) => (prev?.id === stop.id ? null : stop));
    setSelectedNearbyCode(null);
  }

  const destChips = [...stops]
    .map((s) => ({ ...s, distanceKm: myLocation ? haversineDistanceKm(myLocation, s) : null }))
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

  const selectedNearbyRoute = nearby.routes.find((r) => r.code === selectedNearbyCode);
  const fareCardLoading = Boolean(dest) && !trip && !routeError && locStatus === "locating";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {(dest || fareCardLoading) && <FareEtaCard trip={trip} syntheticWalkMinutes={geometry?.syntheticWalkMinutes} loading={fareCardLoading} />}
      {dest && routeError && (
        <div className="ai-chat-map-status-row">
          <i className="ti ti-map-pin-off" />
          <span>{routeError}</span>
        </div>
      )}

      <div className="ai-chat-map-canvas-wrap">
        <div ref={mapContainerRef} className="ai-chat-map-canvas" />

        <button type="button" className="ai-chat-map-locate-btn" onClick={recenter} title="My Location" aria-label="Center map on my location">
          <i className={`ti ti-current-location ${locStatus === "locating" ? "ai-chat-map-locate-spin" : ""}`} />
        </button>

        {(locStatus === "denied" || locStatus === "unsupported") && (
          <div className="ai-chat-map-status-row ai-chat-map-status-row-floating">
            <i className="ti ti-map-pin-off" />
            <span>{locStatus === "unsupported" ? "Location isn't available here." : locError || "Location access is off."}</span>
            {locStatus === "denied" && (
              <button type="button" onClick={recenter}>Try again</button>
            )}
          </div>
        )}

        {!dest && nearby.routes.length > 0 && (
          <div className="ai-chat-map-overlay ai-chat-map-overlay-top">
            <p className="ai-chat-map-overlay-label">Nearby routes</p>
            <div className="ai-chat-map-chip-row">
              {nearby.routes.map(({ code, distanceKm }) => (
                <button
                  key={code}
                  type="button"
                  className={`ai-chat-map-chip ${code === selectedNearbyCode ? "ai-chat-map-chip-active" : ""}`}
                  onClick={() => tapNearbyRoute(code)}
                >
                  {code} · {formatDistance(distanceKm)}
                </button>
              ))}
            </div>
            {selectedNearbyRoute && (
              <p className="ai-chat-map-nearby-detail">{selectedNearbyRoute.route.direction}</p>
            )}
          </div>
        )}

        {!dest && nearby.routes.length === 0 && nearby.fallbackStops.length > 0 && (
          <div className="ai-chat-map-overlay ai-chat-map-overlay-top">
            <p className="ai-chat-map-overlay-label">No routes within 1.5km — nearest stops</p>
            <div className="ai-chat-map-chip-row">
              {nearby.fallbackStops.map(({ stop, distanceKm }) => (
                <button key={stop.id} type="button" className="ai-chat-map-chip" onClick={() => tapDestination(stop)}>
                  {stop.name} · {formatDistance(distanceKm)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ai-chat-map-overlay ai-chat-map-overlay-bottom">
          <p className="ai-chat-map-overlay-label">Go to</p>
          <div className="ai-chat-map-chip-row">
            {destChips.map((stop) => (
              <button
                key={stop.id}
                type="button"
                className={`ai-chat-map-chip ${dest?.id === stop.id ? "ai-chat-map-chip-active" : ""}`}
                onClick={() => tapDestination(stop)}
              >
                {stop.name}{stop.distanceKm != null ? ` · ${formatDistance(stop.distanceKm)}` : ""}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
