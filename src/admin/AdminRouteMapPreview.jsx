import { useEffect, useRef } from "react";
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

const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY;
const TILE_URLS = {
  light: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
  dark: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function accentColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--accent-primary").trim() || "#0e9f40";
}

// Read-only preview of a route's stop sequence — stops themselves are
// created/positioned via AdminLocationPicker on the Stops page; a route
// just orders existing stops, so this only ever draws markers + a
// connecting line, it never edits coordinates.
export default function AdminRouteMapPreview({ stops }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const tileLayerRef = useRef(null);
  const { theme } = useTheme();

  const points = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon));

  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
    mapRef.current = map;
    map.setView([10.3157, 123.8854], 12);
    return () => map.remove();
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerGroupRef.current) layerGroupRef.current.remove();
    if (!points.length) return;

    const group = L.layerGroup();
    points.forEach((stop, i) => {
      L.marker([stop.lat, stop.lon])
        .bindPopup(`${i + 1}. ${stop.name}`)
        .addTo(group);
    });
    if (points.length > 1) {
      L.polyline(points.map((s) => [s.lat, s.lon]), { color: accentColor(), weight: 4, opacity: 0.85 }).addTo(group);
    }
    group.addTo(map);
    layerGroupRef.current = group;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 15);
    } else {
      map.fitBounds(points.map((s) => [s.lat, s.lon]), { padding: [30, 30] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points.map((p) => [p.lat, p.lon]))]);

  return <div className="admin-map-preview" ref={containerRef} />;
}
