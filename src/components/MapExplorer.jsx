import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import useTheme from "../hooks/useTheme";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const CEBU_CENTER = { lat: 10.3157, lon: 123.8854 };
const CEBU_VIEWBOX = "123.75,10.42,124.02,10.20"; // left,top,right,bottom

const TILE_URLS = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function accentColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--accent-primary").trim() || "#0e9f40";
}

function PlaceDropdown({ suggestions, onSelect }) {
  if (!suggestions.length) return null;
  return (
    <div className="stop-dropdown">
      {suggestions.map((place) => (
        <button
          key={place.place_id}
          type="button"
          className="stop-dropdown-item"
          onClick={() => onSelect(place)}
        >
          <i className="ti ti-map-pin" />
          <div className="stop-dropdown-content">
            <p className="stop-name">{place.display_name.split(",")[0]}</p>
            <p className="stop-type">{place.display_name}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function usePlaceSearch() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const timeoutRef = useRef(null);

  function onChange(value) {
    setQuery(value);
    clearTimeout(timeoutRef.current);

    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&countrycodes=ph&viewbox=${CEBU_VIEWBOX}&bounded=1`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        setSuggestions(await res.json());
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  function clear(label) {
    setQuery(label);
    setSuggestions([]);
  }

  return { query, setQuery: clear, suggestions, searching, onChange };
}

export default function MapExplorer({ fullscreen = false, showSearchOverlay = true }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const myLocationMarkerRef = useRef(null);
  const myLocationAccuracyRef = useRef(null);
  const watchIdRef = useRef(null);
  const hasCenteredOnMeRef = useRef(false);
  const userInteractedRef = useRef(false);

  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);
  const [routing, setRouting] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [error, setError] = useState("");
  const [myLocation, setMyLocation] = useState(null);
  // idle | locating | granted | denied | unsupported
  const [locStatus, setLocStatus] = useState("idle");

  const from = usePlaceSearch();
  const to = usePlaceSearch();
  const { theme } = useTheme();
  const tileLayerRef = useRef(null);

  useEffect(() => {
    const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([CEBU_CENTER.lat, CEBU_CENTER.lon], 13);
    L.control.zoom({ position: "bottomleft" }).addTo(map);
    mapRef.current = map;
    // The container's real size (100dvh layout) isn't always settled the
    // instant L.map() runs, which can leave Leaflet's internal size cache
    // stale; invalidateSize() on the next frame corrects it.
    requestAnimationFrame(() => map.invalidateSize());
    return () => map.remove();
  }, []);

  // Once the rider drags the map themselves, stop auto-recentering on GPS
  // updates — only the "My Location" button should move the view after that.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onDragStart = () => { userInteractedRef.current = true; };
    map.on("dragstart", onDragStart);
    return () => map.off("dragstart", onDragStart);
  }, []);

  function centerOnLocation(lat, lon) {
    const map = mapRef.current;
    if (!map) return;
    userInteractedRef.current = false;
    hasCenteredOnMeRef.current = true;
    map.setView([lat, lon], Math.max(map.getZoom(), 16));
  }

  // Continuously tracks the device's real GPS position (never a hardcoded
  // fallback) so the blue dot moves live as the rider moves.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus("unsupported");
      return;
    }

    setLocStatus("locating");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setMyLocation({ lat: latitude, lon: longitude, accuracy });
        setLocStatus("granted");
        if (!hasCenteredOnMeRef.current && !userInteractedRef.current) {
          centerOnLocation(latitude, longitude);
        }
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Draws/updates the Google Maps-style blue dot + accuracy halo whenever a
  // new GPS fix comes in.
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
  }, [myLocation]);

  // The continuous watchPosition() below already keeps `myLocation` fresh,
  // so recentering is instant reuse of that fix. A fresh getCurrentPosition
  // call is only needed when we don't have one yet (e.g. permission was
  // previously denied and the rider is retrying via "Enable Location").
  function requestAndCenterOnMe() {
    if (myLocation) {
      centerOnLocation(myLocation.lat, myLocation.lon);
      return;
    }
    if (!navigator.geolocation) {
      setLocStatus("unsupported");
      return;
    }
    setLocStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setMyLocation({ lat: latitude, lon: longitude, accuracy });
        setLocStatus("granted");
        centerOnLocation(latitude, longitude);
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

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

  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      return data.display_name || "Pinned location";
    } catch {
      return "Pinned location";
    }
  }

  function makeDraggableMarker(lat, lon, label, onMove) {
    const marker = L.marker([lat, lon], { draggable: true }).addTo(mapRef.current).bindPopup(label);
    marker.on("dragend", async () => {
      const { lat: newLat, lng: newLon } = marker.getLatLng();
      marker.bindPopup("Updating…").openPopup();
      const newLabel = await reverseGeocode(newLat, newLon);
      marker.bindPopup(newLabel).openPopup();
      onMove(newLat, newLon, newLabel);
    });
    return marker;
  }

  function placeOrigin(lat, lon, label) {
    const map = mapRef.current;
    if (originMarkerRef.current) map.removeLayer(originMarkerRef.current);
    originMarkerRef.current = makeDraggableMarker(lat, lon, label, (newLat, newLon, newLabel) => {
      setOrigin({ lat: newLat, lon: newLon });
      from.setQuery(newLabel);
    });
    setOrigin({ lat, lon });
    map.setView([lat, lon], 14);
  }

  function placeDest(lat, lon, label, openPopup) {
    const map = mapRef.current;
    if (destMarkerRef.current) map.removeLayer(destMarkerRef.current);
    destMarkerRef.current = makeDraggableMarker(lat, lon, label, (newLat, newLon, newLabel) => {
      setDest({ lat: newLat, lon: newLon });
      to.setQuery(newLabel);
    });
    if (openPopup) destMarkerRef.current.openPopup();
    setDest({ lat, lon });
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        from.setQuery("Your location");
        placeOrigin(pos.coords.latitude, pos.coords.longitude, "Your location");
      },
      () => setError("Couldn't get your location."),
      { timeout: 8000 }
    );
  }

  function selectFrom(place) {
    from.setQuery(place.display_name);
    setError("");
    placeOrigin(parseFloat(place.lat), parseFloat(place.lon), place.display_name);
  }

  function selectTo(place) {
    to.setQuery(place.display_name);
    setError("");
    placeDest(parseFloat(place.lat), parseFloat(place.lon), place.display_name, true);
  }

  function swap() {
    if (!origin || !dest) return;
    const fromQuery = from.query;
    const toQuery = to.query;

    from.setQuery(toQuery);
    to.setQuery(fromQuery);

    placeOrigin(dest.lat, dest.lon, toQuery);
    placeDest(origin.lat, origin.lon, fromQuery, false);
  }

  useEffect(() => {
    if (!origin || !dest) return;

    let cancelled = false;
    setRouting(true);
    setError("");

    (async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;

        if (data.code !== "Ok" || !data.routes?.length) {
          setError("No route found between those points.");
          setRouteInfo(null);
          return;
        }

        const route = data.routes[0];
        const latLngs = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        const map = mapRef.current;

        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = L.polyline(latLngs, { color: accentColor(), weight: 5, opacity: 0.9 }).addTo(map);
        map.fitBounds(routeLayerRef.current.getBounds(), { padding: [32, 32] });

        setRouteInfo({
          distanceKm: (route.distance / 1000).toFixed(1),
          durationMin: Math.round(route.duration / 60),
        });
      } catch {
        if (!cancelled) setError("Couldn't fetch directions. Try again.");
      } finally {
        if (!cancelled) setRouting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [origin, dest]);

  const searchFields = (
    <div className="search-card" style={{ margin: 0, boxShadow: "none", padding: 0, border: "none", background: "transparent" }}>
      <div className="search-field from-field">
        <i className="ti ti-current-location" />
        <div className="search-input-wrapper">
          <input
            type="text"
            value={from.query}
            onChange={(e) => from.onChange(e.target.value)}
            placeholder="From (or use my location)"
            className="search-input"
            autoComplete="off"
          />
          <PlaceDropdown suggestions={from.suggestions} onSelect={selectFrom} />
        </div>
        <button type="button" onClick={useMyLocation} title="Use my location" style={{ background: "transparent", flexShrink: 0, color: "var(--accent-primary)" }}>
          <i className="ti ti-locate" />
        </button>
      </div>

      <button type="button" className="swap-button" onClick={swap} disabled={!origin || !dest} title="Swap From and To">
        <i className="ti ti-arrows-sort" />
      </button>

      <div className="search-field to-field">
        <i className="ti ti-map-pin" />
        <div className="search-input-wrapper">
          <input
            type="text"
            value={to.query}
            onChange={(e) => to.onChange(e.target.value)}
            placeholder="Where do you want to go?"
            className="search-input"
            autoComplete="off"
          />
          <PlaceDropdown suggestions={to.suggestions} onSelect={selectTo} />
        </div>
      </div>
    </div>
  );

  const statusInfo = (
    <>
      {(from.searching || to.searching || routing) && (
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
          {routing ? "Getting directions…" : "Searching…"}
        </p>
      )}
      {error && <p style={{ fontSize: 12, color: "#e53935", marginBottom: 8 }}>{error}</p>}
      {routeInfo && (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 4, fontSize: 13, color: "var(--text-primary)" }}>
            <span><strong>{routeInfo.distanceKm} km</strong></span>
            <span><strong>{routeInfo.durationMin} min</strong> by road</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 8 }}>Tip: drag either pin to fine-tune the exact spot</p>
        </>
      )}
    </>
  );

  if (fullscreen) {
    // zIndex: 0 makes this wrapper its own stacking context, so the overlays
    // below (plain positive z-index) correctly paint above Leaflet's internal
    // panes (its map pane alone sits at z-index 400) instead of leaking out
    // and losing to them.
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", zIndex: 0 }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
        {showSearchOverlay && (
          <div style={{
            position: "absolute", top: 72, left: 16, right: 16, zIndex: 150,
            background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
            padding: 14, boxShadow: "0 8px 24px rgba(var(--shadow-rgb), 0.18)",
          }}>
            {searchFields}
            {(routeInfo || error || routing) && <div style={{ marginTop: 10 }}>{statusInfo}</div>}
          </div>
        )}

        {(locStatus === "denied" || locStatus === "unsupported") && (
          <div className="my-location-banner" style={{ top: showSearchOverlay ? 230 : 88 }}>
            <i className="ti ti-map-pin-off" />
            <span>{locStatus === "unsupported" ? "Location isn't available on this device" : "Location access is off"}</span>
            <button type="button" onClick={requestAndCenterOnMe}>Enable Location</button>
          </div>
        )}

        <button
          type="button"
          className="my-location-button"
          style={{ top: showSearchOverlay ? 230 : 88 }}
          onClick={requestAndCenterOnMe}
          title="My Location"
          aria-label="Center map on my location"
        >
          <i className={`ti ti-current-location ${locStatus === "locating" ? "my-location-button-spin" : ""}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="map-explorer-section">
      <p className="section-label">Explore &amp; get directions</p>
      {searchFields}
      <div style={{ marginTop: 12 }}>
        {statusInfo}
        <div
          ref={mapContainerRef}
          style={{ width: "100%", height: 320, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(var(--border-rgb), 0.10)" }}
        />
      </div>
    </div>
  );
}
