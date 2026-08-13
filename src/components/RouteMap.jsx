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

const TILE_URLS = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function accentColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--accent-primary").trim() || "#0e9f40";
}

export default function RouteMap({ from, to }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const { theme } = useTheme();

  const hasCoords = Number.isFinite(from?.lat) && Number.isFinite(to?.lat);

  useEffect(() => {
    if (!hasCoords) return;

    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
    mapRef.current = map;

    L.marker([from.lat, from.lon]).addTo(map).bindPopup(from.name);
    L.marker([to.lat, to.lon]).addTo(map).bindPopup(to.name);
    map.fitBounds([[from.lat, from.lon], [to.lat, to.lon]], { padding: [40, 40] });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords, from?.id, to?.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCoords) return;

    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(TILE_URLS[theme] || TILE_URLS.light, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    if (routeLayerRef.current) {
      routeLayerRef.current.setStyle({ color: accentColor() });
    }
  }, [theme, hasCoords]);

  useEffect(() => {
    if (!hasCoords) return;
    const map = mapRef.current;
    let cancelled = false;

    (async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled || !map || data.code !== "Ok" || !data.routes?.length) return;

        const latLngs = data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        routeLayerRef.current = L.polyline(latLngs, { color: accentColor(), weight: 5, opacity: 0.9 }).addTo(map);
      } catch {
        // Road route is a nice-to-have; markers + bounds already show the trip
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords, from?.id, to?.id]);

  if (!hasCoords) {
    return (
      <div className="route-map-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
        Map unavailable for this route
      </div>
    );
  }

  return <div className="route-map-container" ref={containerRef} style={{ minHeight: 280 }} />;
}
