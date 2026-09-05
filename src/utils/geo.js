const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(a, b) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const WALKING_SPEED_KMH = 4.5;

// Estimated walking time for a distance the route graph doesn't cover itself
// (e.g. GPS fix -> nearest stop) — always at least 1 minute so a very short
// hop still reads as "a little walk" rather than 0.
export function walkingMinutes(km) {
  return Math.max(1, Math.round((km / WALKING_SPEED_KMH) * 60));
}

// Forward geocoding for the admin location picker's search box — same
// Nominatim service as reverseGeocode above, just the other direction.
// Returns up to 5 candidates so the admin can pick the right one rather
// than silently jumping to Nominatim's single best (and possibly wrong)
// guess.
export async function forwardGeocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=0`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Location search failed (${res.status})`);
  const data = await res.json();
  return data.map((item) => ({
    label: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
  }));
}

// Metro Cebu bounding box (Liloan south to Talisay, the western coastline
// east to Mactan) — lon_min,lat_max,lon_max,lat_min, Nominatim's expected
// corner order. Scopes searchCebuLandmark to real Cebu places so a query
// like "SM Seaside" doesn't lose to a same-named place somewhere else.
const CEBU_VIEWBOX = "123.75,10.45,124.05,10.15";

// A real-world landmark lookup for whatever the rider typed that isn't in
// TransitGo's curated stops/terminals/destinations — same public Nominatim
// service as reverseGeocode/forwardGeocode above, scoped to Metro Cebu via
// bounded=1 + viewbox. This is the last-resort tier api/transit.js's
// resolveRealWorldLandmark() uses only after the curated list has already
// come back empty (even fuzzily) — it returns the single best real match,
// or null, and never invents a place when OpenStreetMap has nothing for it.
export async function searchCebuLandmark(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${CEBU_VIEWBOX}&bounded=1&limit=1&addressdetails=0`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Landmark search failed (${res.status})`);
  const data = await res.json();
  if (!data.length) return null;
  const hit = data[0];
  return { label: shortenAddress(hit.display_name), lat: Number(hit.lat), lon: Number(hit.lon) };
}

// "250m" below 1km, "1.3km" at/above it — matches how riders actually
// think about short walking distances instead of always showing decimal km.
export function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// Initial great-circle bearing from `from` to `to`, in degrees clockwise
// from true north (0-360) — what the AR camera overlay rotates its arrow
// against once it also knows which way the phone itself is facing.
export function bearingTo(from, to) {
  const toRad = (d) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(to.lon - from.lon)) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lon - from.lon));
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

const COMPASS_LABELS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

// Fallback direction text for when no compass heading is available yet
// (desktop, or before the rider grants the iOS motion-sensor prompt).
export function compassLabel(bearingDeg) {
  return COMPASS_LABELS[Math.round(bearingDeg / 45) % 8];
}

const TURN_MODIFIER_TEXT = {
  left: "Turn left",
  right: "Turn right",
  "slight left": "Slight left",
  "slight right": "Slight right",
  "sharp left": "Sharp left",
  "sharp right": "Sharp right",
  uturn: "Make a U-turn",
  straight: "Continue straight",
};

// Human-readable text for an OSRM route step's `maneuver` object — covers
// the maneuver.type values the foot profile actually emits (turn, depart,
// arrive, continue/new name/merge/fork/end of road share the same
// left/right modifier vocabulary, roundabouts are rare on foot routes but
// handled for completeness). Falls back to "Continue straight" for any
// type/modifier OSRM adds that this doesn't know about yet, rather than
// showing nothing.
export function describeManeuver(maneuver) {
  if (!maneuver) return "Continue straight";
  const { type, modifier } = maneuver;
  if (type === "depart") return "Head out";
  if (type === "arrive") return "You've arrived";
  if (type === "roundabout" || type === "rotary" || type === "roundabout turn") return "Enter the roundabout";
  return TURN_MODIFIER_TEXT[modifier] || "Continue straight";
}

// Turns a GPS fix into a human-readable address via Nominatim's public
// reverse-geocoding endpoint (the same OSM service MapExplorer already uses
// for its own pins). Throws on network failure or an empty result so
// callers can fall back to something else instead of silently showing "".
export async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=0`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Reverse geocode request failed (${res.status})`);
  const data = await res.json();
  if (!data?.display_name) throw new Error("No address found for this location");
  return data.display_name;
}

// Nominatim's display_name is a full postal-style string ("Salinas Drive,
// Apas, Cebu City, Cebu, 6000, Philippines") — too long for a one-line
// search field, so this keeps just the first couple of meaningful parts
// ("Salinas Drive, Apas").
export function shortenAddress(displayName) {
  const parts = displayName.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.slice(0, 2).join(", ") || displayName;
}
