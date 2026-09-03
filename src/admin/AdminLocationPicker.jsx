import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import useTheme from "../hooks/useTheme";
import { forwardGeocode } from "../utils/geo";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY;
const TILE_URLS = {
  light: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
  dark: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const DEFAULT_CENTER = [10.3157, 123.8854]; // Cebu City

// Click-or-drag-to-place map picker, reused by the Stop and Terminal forms —
// same Leaflet/tile setup RouteMap.jsx already uses, just editable. Calls
// onChange({ lat, lon }) whenever the marker moves.
export default function AdminLocationPicker({ lat, lon, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
    mapRef.current = map;
    const center = hasCoords ? [lat, lon] : DEFAULT_CENTER;
    map.setView(center, hasCoords ? 15 : 12);

    const marker = L.marker(center, { draggable: true }).addTo(map);
    markerRef.current = marker;
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChange({ lat: pos.lat, lon: pos.lng });
    });

    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      onChange({ lat: e.latlng.lat, lon: e.latlng.lng });
    });

    return () => map.remove();
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
  }, [theme]);

  // Keep the marker in sync if coordinates change from outside (e.g. a
  // search result picked below, or the form loading existing values).
  useEffect(() => {
    if (!hasCoords || !markerRef.current || !mapRef.current) return;
    markerRef.current.setLatLng([lat, lon]);
    mapRef.current.setView([lat, lon], mapRef.current.getZoom() < 14 ? 15 : mapRef.current.getZoom());
  }, [lat, lon, hasCoords]);

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await forwardGeocode(query.trim()));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (r) => {
    setResults([]);
    setQuery(r.label);
    onChange({ lat: r.lat, lon: r.lon });
  };

  return (
    <div>
      <form className="admin-location-picker-search" onSubmit={runSearch}>
        <input
          type="text"
          className="admin-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a location…"
        />
        {results.length > 0 && (
          <div className="admin-location-picker-results">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                className="admin-location-picker-result"
                onClick={() => pickResult(r)}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </form>
      <div style={{ height: 10 }} />
      <div className="admin-map-preview" ref={containerRef} />
      <div style={{ height: 6 }} />
      <p className="admin-latlon-readout">
        {searching
          ? "Searching…"
          : hasCoords
            ? `${lat.toFixed(5)}, ${lon.toFixed(5)} — click or drag the pin to adjust`
            : "Search above, or click the map to set a location"}
      </p>
    </div>
  );
}
